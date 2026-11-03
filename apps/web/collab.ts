import * as Y from 'yjs';
import type { SceneStore } from '../../packages/engine';
import { SCENE_VERSION } from '../../packages/schema';
export type Role = 'viewer' | 'commenter' | 'editor' | 'owner';
export interface Presence { peer: string; name: string; color: string; cursor?: { x: number; y: number }; selection: string[]; view: { x: number; y: number; zoom: number }; frame?: string | null; time: number }
export interface Comment { id: string; author: string; text: string; time: number }
export interface Thread { id: string; elementId?: string; x: number; y: number; resolved: boolean; comments: Comment[] }
export type CommentEvent = { kind: 'thread'; thread: Thread } | { kind: 'reply'; threadId: string; comment: Comment } | { kind: 'resolve'; threadId: string; resolved: boolean };
export function applyCommentEvent(threads: Thread[], event: CommentEvent): Thread[] {
  if (event.kind === 'thread') return threads.some(t => t.id === event.thread.id) ? threads : [...threads, event.thread];
  return threads.map(t => t.id !== event.threadId ? t : event.kind === 'resolve' ? { ...t, resolved: event.resolved } : t.comments.some(c => c.id === event.comment.id) ? t : { ...t, comments: [...t.comments, event.comment] });
}
export const mentions = (text: string) => [...text.matchAll(/@([\w.-]{2,40})/g)].map(m => m[1]!);
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function createRoomKey(): Promise<string> { const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); return b64(new Uint8Array(await crypto.subtle.exportKey('raw', key))); }
const importKey = (raw: string) => crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
async function seal(key: CryptoKey, kind: number, plain: Uint8Array<ArrayBuffer>): Promise<Uint8Array> { const iv = crypto.getRandomValues(new Uint8Array(12)), cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new Uint8Array([kind === 3 ? 0 : kind]) }, key, plain)); const out = new Uint8Array(1 + 12 + cipher.length); out[0] = kind; out.set(iv, 1); out.set(cipher, 13); return out; }
async function open(key: CryptoKey, frame: Uint8Array<ArrayBuffer>): Promise<Uint8Array> { const kind = frame[0]! === 3 ? 0 : frame[0]!; return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: frame.slice(1, 13), additionalData: new Uint8Array([kind]) }, key, frame.slice(13))); }
export function shareUrl(roomId: string, key: string, link?: string, embed = false) { const params = new URLSearchParams({ room: roomId, key }); if (link) params.set('link', link); return `${location.origin}${embed ? '/embed' : '/'}#${params}`; }
export function readShareFragment(): { room: string; key: string; link?: string } | null { const p = new URLSearchParams(location.hash.slice(1)), room = p.get('room'), key = p.get('key'); return room && key && /^[\w-]+$/.test(room) ? { room, key, link: p.get('link') || undefined } : null; }
export const REMOTE = Symbol('remote collaborator');
let base = '', authToken: string | null = null;
try { authToken = localStorage.getItem('canvas-collab-token'); } catch {}
export function setCollabBase(url: string) { base = url.replace(/\/$/, ''); }
export function setAuthToken(token: string | null) { authToken = token; try { if (token) localStorage.setItem('canvas-collab-token', token); else localStorage.removeItem('canvas-collab-token'); } catch {} }
const authHeaders = (): Record<string, string> => authToken ? { Authorization: `Bearer ${authToken}` } : {};
interface Options { store: SceneStore; room: string; key: string; link?: string; password?: string; name: string; onStatus: (status: string) => void; onRole: (role: Role) => void; onPresence: (peers: Presence[]) => void; onComment: (event: CommentEvent) => void; onRevoked: (reason: string) => void }
export class CollabSession {
  private ws: WebSocket | null = null; private key: Promise<CryptoKey>; private role: Role | null = null; private closed = false; private retry = 0; private peer = ''; private peers = new Map<string, Presence>(); private unsubscribe: () => void; private presenceTimer: ReturnType<typeof setTimeout> | null = null; private lastPresence: Omit<Presence, 'peer' | 'time'> | null = null; private sceneUpdates = 0;
  readonly color = `hsl(${Math.floor(Math.random() * 360)} 70% 45%)`;
  constructor(private options: Options) {
    this.key = importKey(options.key);
    const handler = (update: Uint8Array, origin: unknown) => { if (origin !== REMOTE && this.canEdit()) void this.send(0, new Uint8Array(update)); };
    options.store.doc.on('update', handler); this.unsubscribe = () => options.store.doc.off('update', handler);
    this.connect();
  }
  private canEdit() { return this.role === 'editor' || this.role === 'owner'; }
  canComment() { return !!this.role && this.role !== 'viewer'; }
  getRole() { return this.role; }
  private connect() {
    if (this.closed) return;
    const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/collab/${this.options.room}`); ws.binaryType = 'arraybuffer'; this.ws = ws;
    this.options.onStatus('Connecting to shared session…');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', link: this.options.link, password: this.options.password, version: SCENE_VERSION, auth: authToken }));
    ws.onmessage = event => void this.receive(event.data);
    ws.onclose = event => {
      this.ws = null; this.peers.clear(); this.options.onPresence([]);
      if (event.code === 4003 || event.code === 4001) { this.closed = true; this.options.onRevoked(event.reason || 'Access ended'); return; }
      if (this.closed) return; const delay = Math.min(15000, 500 * 2 ** this.retry++); this.options.onStatus(`Offline. Edits stay local and merge on reconnect (retry in ${Math.round(delay / 1000)}s)`); setTimeout(() => this.connect(), delay);
    };
  }
  private async receive(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      const message = JSON.parse(data);
      if (message.type === 'welcome') { this.role = message.role; this.peer = message.peer; this.retry = 0; this.options.onRole(message.role); }
      else if (message.type === 'synced') { this.sceneUpdates = message.updates; if (this.canEdit()) { const state = new Uint8Array(Y.encodeStateAsUpdate(this.options.store.doc)); await this.send(this.sceneUpdates > 200 ? 3 : 0, state); if (this.sceneUpdates > 200) this.sceneUpdates = 1; } this.options.onStatus(`Live · ${this.role}`); if (this.lastPresence) this.presence(this.lastPresence); }
      else if (message.type === 'left') { this.peers.delete(message.peer); this.options.onPresence([...this.peers.values()]); }
      else if (message.type === 'error') this.options.onStatus(message.error);
      return;
    }
    const frame = new Uint8Array(data);
    let plain: Uint8Array; try { plain = await open(await this.key, frame); } catch { this.options.onStatus('Received data this key cannot decrypt. Check the share link.'); return; }
    if (frame[0] === 0) { Y.applyUpdate(this.options.store.doc, plain, REMOTE); this.sceneUpdates++; }
    else if (frame[0] === 1) { try { this.options.onComment(JSON.parse(new TextDecoder().decode(plain))); } catch {} }
    else if (frame[0] === 2) { try { const p = JSON.parse(new TextDecoder().decode(plain)) as Presence; if (p.peer && p.peer !== this.peer) { this.peers.set(p.peer, { ...p, time: Date.now() }); this.options.onPresence([...this.peers.values()]); } } catch {} }
  }
  private async send(kind: number, plain: Uint8Array<ArrayBuffer>) { const ws = this.ws; if (!ws || ws.readyState !== WebSocket.OPEN || !this.role) return; ws.send(await seal(await this.key, kind, plain)); }
  comment(event: CommentEvent) { if (this.canComment()) void this.send(1, new TextEncoder().encode(JSON.stringify(event))); }
  presence(state: Omit<Presence, 'peer' | 'time'>) {
    this.lastPresence = state; if (this.presenceTimer) return;
    this.presenceTimer = setTimeout(() => { this.presenceTimer = null; if (this.lastPresence) void this.send(2, new TextEncoder().encode(JSON.stringify({ ...this.lastPresence, peer: this.peer, time: Date.now() }))); }, 50);
  }
  private uploaded = new Set<string>(); private fetching = new Set<string>();
  async syncAssets(assetIds: string[], loadLocal: (id: string) => Promise<unknown>, onLoaded: () => void) {
    const headers: Record<string, string> = { ...authHeaders(), ...(this.options.link ? { 'x-link-token': this.options.link, ...(this.options.password ? { 'x-link-password': this.options.password } : {}) } : {}) };
    const root = await navigator.storage.getDirectory(), assetBase = `${base}/api/rooms/${this.options.room}/assets/`;
    await Promise.all([...new Set(assetIds)].filter(id => /^[\w-]+$/.test(id)).map(async id => {
      let local: File | null = null; try { local = await (await root.getFileHandle(id)).getFile(); } catch {}
      if (local) { if (this.canEdit() && !this.uploaded.has(id)) { this.uploaded.add(id); const sealed = await seal(await this.key, 4, new Uint8Array(await local.arrayBuffer())); const response = await fetch(assetBase + id, { method: 'PUT', headers, body: sealed as BodyInit }); if (!response.ok) this.uploaded.delete(id); } return; }
      if (this.fetching.has(id)) return; this.fetching.add(id);
      try { const response = await fetch(assetBase + id, { headers }); if (!response.ok) return; const plain = await open(await this.key, new Uint8Array(await response.arrayBuffer())); const handle = await root.getFileHandle(id, { create: true }), writer = await handle.createWritable(); await writer.write(plain as BufferSource); await writer.close(); this.uploaded.add(id); await loadLocal(id); onLoaded(); } catch { } finally { this.fetching.delete(id); }
    }));
  }
  close() { this.closed = true; this.unsubscribe(); this.ws?.close(); if (this.presenceTimer) clearTimeout(this.presenceTimer); }
}
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  if (!base) throw new Error('Collaboration is not configured on this deployment');
  const response = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init.headers } });
  const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`); return data as T;
}
