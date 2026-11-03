import { DurableObject } from 'cloudflare:workers';
type Role = 'viewer' | 'commenter' | 'editor' | 'owner';
interface Env { ROOMS: DurableObjectNamespace<Room>; DIRECTORY: DurableObjectNamespace<Directory>; ALLOWED_ORIGIN: string }
const rank: Record<Role, number> = { viewer: 0, commenter: 1, editor: 2, owner: 3 };
const linkRole: Record<string, Role> = { view: 'viewer', comment: 'commenter', edit: 'editor' };
const SCENE = 0, COMMENT = 1, PRESENCE = 2, COMPACT = 3, CHUNK = 1024 * 1024, SCHEMA = 1;
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = () => b64(crypto.getRandomValues(new Uint8Array(24)));
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
  return `${b64(salt)}$${b64(bits)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split('$'); const bytes = Uint8Array.from(atob(salt!.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const candidate = await hashPassword(password, bytes); let diff = candidate.length ^ stored.length; for (let i = 0; i < Math.min(candidate.length, stored.length); i++) diff |= candidate.charCodeAt(i) ^ stored.charCodeAt(i); return diff === 0;
}
const bearer = (request: Request) => request.headers.get('authorization')?.match(/^Bearer ([\w-]+)$/)?.[1] || null;
export class Directory extends DurableObject<Env> {
  private sql = this.ctx.storage.sql;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS teams(id TEXT PRIMARY KEY, name TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members(team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY(team_id, user_id));
CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, team_id TEXT, title TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS links(token TEXT PRIMARY KEY, room_id TEXT NOT NULL, role TEXT NOT NULL, expires INTEGER, hash TEXT, revoked INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS libraries(team_id TEXT PRIMARY KEY, data TEXT NOT NULL);`);
  }
  private one<T>(query: string, ...args: unknown[]): T | null { return (this.sql.exec(query, ...args).toArray()[0] as T) || null; }
  private all<T>(query: string, ...args: unknown[]): T[] { return this.sql.exec(query, ...args).toArray() as T[]; }
  me(token: string | null): { id: string; name: string } | null { return token ? this.one('SELECT users.id, users.name FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?', token, Date.now()) : null; }
  private teamRole(team: string, user: string): Role | null { return this.one<{ role: Role }>('SELECT role FROM members WHERE team_id = ? AND user_id = ?', team, user)?.role || null; }
  async roleFor(room: string, userId: string | null, link: string | null, password: string | null): Promise<Role | null> {
    const row = this.one<{ owner_id: string; team_id: string | null }>('SELECT owner_id, team_id FROM rooms WHERE id = ?', room); if (!row) return null;
    let best: Role | null = null; const take = (r: Role | null | undefined) => { if (r && (!best || rank[r] > rank[best])) best = r; };
    if (userId && row.owner_id === userId) take('owner');
    if (userId && row.team_id) take(this.teamRole(row.team_id, userId));
    if (link) { const l = this.one<{ role: string; expires: number | null; hash: string | null }>('SELECT role, expires, hash FROM links WHERE token = ? AND room_id = ? AND revoked = 0', link, room); if (l && (!l.expires || l.expires > Date.now()) && (!l.hash || (password !== null && await verifyPassword(password, l.hash)))) take(linkRole[l.role]); }
    return best;
  }
  private kick(rooms: string[], filter: { user?: string; link?: string; links?: boolean }, reason: string) { for (const room of rooms) void this.env.ROOMS.get(this.env.ROOMS.idFromName(room)).kick(filter, reason); }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url), path = url.pathname.replace(/^\/api\//, '').split('/'), method = request.method, token = bearer(request), user = this.me(token);
    const input = async (limit = 64 * 1024): Promise<Record<string, unknown>> => { const text = await request.text(); if (text.length > limit) throw new Error('Request too large'); return text ? JSON.parse(text) : {}; };
    try {
      if (path[0] === 'auth') {
        if (path[1] === 'me') return json({ user });
        if (method !== 'POST') return json({ error: 'Not found' }, 404);
        if (path[1] === 'logout') { if (token) this.sql.exec('DELETE FROM sessions WHERE token = ?', token); return json({ ok: true }); }
        const body = await input(), name = String(body.name || '').trim(), password = String(body.password || '');
        if (!/^[\w.-]{2,40}$/.test(name) || password.length < 8 || password.length > 200) return json({ error: 'Use a 2–40 character name (letters, digits, . _ -) and a password of at least 8 characters' }, 400);
        let account = this.one<{ id: string; name: string; hash: string }>('SELECT id, name, hash FROM users WHERE name = ?', name);
        if (path[1] === 'register') { if (account) return json({ error: 'That name is taken' }, 409); account = { id: crypto.randomUUID(), name, hash: await hashPassword(password) }; this.sql.exec('INSERT INTO users VALUES (?, ?, ?, ?)', account.id, name, account.hash, Date.now()); }
        else if (path[1] !== 'login' || !account || !await verifyPassword(password, account.hash)) return json({ error: 'Wrong name or password' }, 401);
        const session = randomToken(); this.sql.exec('INSERT INTO sessions VALUES (?, ?, ?)', session, account.id, Date.now() + 30 * 864e5);
        return json({ user: { id: account.id, name: account.name }, token: session });
      }
      if (!user) return json({ error: 'Sign in first' }, 401);
      if (path[0] === 'teams') {
        if (!path[1]) {
          if (method === 'POST') { const name = String((await input()).name || '').trim().slice(0, 80); if (!name) return json({ error: 'Name the team' }, 400); const team = crypto.randomUUID(); this.sql.exec('INSERT INTO teams VALUES (?, ?, ?)', team, name, Date.now()); this.sql.exec('INSERT INTO members VALUES (?, ?, ?)', team, user.id, 'owner'); return json({ id: team }); }
          const teams = this.all<{ id: string; name: string; role: Role }>('SELECT teams.id, teams.name, members.role FROM teams JOIN members ON members.team_id = teams.id WHERE members.user_id = ?', user.id);
          return json({ teams: teams.map(t => ({ ...t, members: this.all('SELECT users.id, users.name, members.role FROM members JOIN users ON users.id = members.user_id WHERE team_id = ?', t.id) })) });
        }
        const team = path[1], mine = this.teamRole(team, user.id); if (!mine) return json({ error: 'Not a member' }, 403);
        const teamRooms = () => this.all<{ id: string }>('SELECT id FROM rooms WHERE team_id = ?', team).map(r => r.id);
        if (path[2] === 'library') { if (method === 'PUT') { if (rank[mine] < rank.editor) return json({ error: 'Editors only' }, 403); const data = JSON.stringify(await input(1024 * 1024)); this.sql.exec('INSERT INTO libraries VALUES (?, ?) ON CONFLICT(team_id) DO UPDATE SET data = excluded.data', team, data); return json({ ok: true }); } return json(JSON.parse(this.one<{ data: string }>('SELECT data FROM libraries WHERE team_id = ?', team)?.data || '{"icons":[]}')); }
        if (path[2] === 'members') {
          if (mine !== 'owner') return json({ error: 'Owners only' }, 403);
          if (method === 'POST') { const body = await input(), role = String(body.role) as Role, member = this.one<{ id: string }>('SELECT id FROM users WHERE name = ?', String(body.name)); if (!member || !(role in rank)) return json({ error: 'Unknown user or role' }, 400); this.sql.exec('INSERT INTO members VALUES (?, ?, ?) ON CONFLICT(team_id, user_id) DO UPDATE SET role = excluded.role', team, member.id, role); this.kick(teamRooms(), { user: member.id }, 'Role changed. Reconnect.'); return json({ ok: true }); }
          if (method === 'DELETE' && path[3]) { this.sql.exec('DELETE FROM members WHERE team_id = ? AND user_id = ?', team, path[3]); this.kick(teamRooms(), { user: path[3] }, 'Team access removed'); return json({ ok: true }); }
        }
        return json({ error: 'Not found' }, 404);
      }
      if (path[0] === 'rooms') {
        if (!path[1]) {
          if (method === 'POST') { const body = await input(), team = typeof body.teamId === 'string' ? body.teamId : null; if (team && rank[this.teamRole(team, user.id) || 'viewer'] < rank.editor) return json({ error: 'Join the team as an editor first' }, 403); const room = crypto.randomUUID(); this.sql.exec('INSERT INTO rooms VALUES (?, ?, ?, ?, ?)', room, user.id, team, String(body.title || '').slice(0, 200), Date.now()); return json({ id: room }); }
          return json({ rooms: this.all('SELECT rooms.id, rooms.title, rooms.team_id AS teamId, rooms.owner_id = ?1 AS owned FROM rooms LEFT JOIN members ON members.team_id = rooms.team_id AND members.user_id = ?1 WHERE rooms.owner_id = ?1 OR members.user_id IS NOT NULL ORDER BY rooms.created DESC', user.id) });
        }
        const room = path[1]; if (path[2] !== 'links') return json({ error: 'Not found' }, 404);
        if (await this.roleFor(room, user.id, null, null) !== 'owner') return json({ error: 'Only the owner manages links' }, 403);
        if (method === 'POST') { const body = await input(), kind = String(body.role); if (!linkRole[kind]) return json({ error: 'Choose view, comment or edit' }, 400); const expires = body.expiresAt ? Number(body.expiresAt) : null; if (expires !== null && !(expires > Date.now())) return json({ error: 'Expiry must be in the future' }, 400); const link = randomToken(); this.sql.exec('INSERT INTO links VALUES (?, ?, ?, ?, ?, 0, ?)', link, room, kind, expires, body.password ? await hashPassword(String(body.password)) : null, Date.now()); return json({ token: link }); }
        if (method === 'DELETE') { if (path[3]) this.sql.exec('UPDATE links SET revoked = 1 WHERE token = ? AND room_id = ?', path[3], room); else this.sql.exec('UPDATE links SET revoked = 1 WHERE room_id = ?', room); this.kick([room], path[3] ? { link: path[3] } : { links: true }, 'Link revoked'); return json({ ok: true }); }
        return json({ links: this.all('SELECT token, role, expires, hash IS NOT NULL AS protected, revoked FROM links WHERE room_id = ? ORDER BY created DESC', room) });
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) { return json({ error: error instanceof Error ? error.message : 'Request failed' }, 400); }
  }
}
type Attachment = { peer: string; room: string; role: Role | null; user: string | null; link: string | null };
export class Room extends DurableObject<Env> {
  private sql = this.ctx.storage.sql;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS updates(seq INTEGER PRIMARY KEY AUTOINCREMENT, kind INTEGER NOT NULL, data BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS assets(id TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(id, part));`);
  }
  private directory() { return this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('directory')); }
  private peers() { return this.ctx.getWebSockets().filter(ws => (ws.deserializeAttachment() as Attachment)?.role); }
  async kick(filter: { user?: string; link?: string; links?: boolean }, reason: string) {
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment() as Attachment; if (a.role === 'owner' && !filter.user) continue; if ((filter.user && a.user === filter.user) || (filter.link && a.link === filter.link) || (filter.links && a.link)) ws.close(4003, reason); }
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url), parts = url.pathname.split('/');
    if (parts[1] === 'collab') {
      if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'WebSocket required' }, 426);
      const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ peer: crypto.randomUUID(), room: parts[2]!, role: null, user: null, link: null } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    const asset = parts[5], room = parts[3]!;
    if (!asset || !/^[\w-]{1,80}$/.test(asset)) return json({ error: 'Not found' }, 404);
    const directory = this.directory(), user = await directory.me(bearer(request));
    const role = await directory.roleFor(room, user?.id || null, request.headers.get('x-link-token'), request.headers.get('x-link-password'));
    if (!role) return json({ error: 'No access' }, 403);
    if (request.method === 'PUT') {
      if (rank[role] < rank.editor) return json({ error: 'Editors only' }, 403);
      const bytes = new Uint8Array(await request.arrayBuffer()); if (bytes.length > 12 * 1024 * 1024) return json({ error: 'Asset too large' }, 413);
      this.sql.exec('DELETE FROM assets WHERE id = ?', asset); for (let i = 0; i * CHUNK < bytes.length; i++) this.sql.exec('INSERT INTO assets VALUES (?, ?, ?)', asset, i, bytes.slice(i * CHUNK, (i + 1) * CHUNK));
      return json({ ok: true });
    }
    const rows = this.sql.exec('SELECT data FROM assets WHERE id = ? ORDER BY part', asset).toArray() as { data: ArrayBuffer }[];
    if (!rows.length) return json({ error: 'Not found' }, 404);
    return new Response(new Blob(rows.map(r => r.data)), { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, max-age=31536000, immutable' } });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const a = ws.deserializeAttachment() as Attachment, room = a.room;
    if (typeof message === 'string') {
      if (a.role) return;
      let hello: { link?: string; password?: string; version?: number; auth?: string };
      try { hello = JSON.parse(message); } catch { ws.close(4000, 'Invalid hello'); return; }
      if (hello.version !== SCHEMA) { ws.send(JSON.stringify({ type: 'error', error: `This drawing uses document version ${SCHEMA}. Update the app.` })); ws.close(4001, 'Version mismatch'); return; }
      const directory = this.directory(), user = await directory.me(typeof hello.auth === 'string' ? hello.auth : null);
      const role = await directory.roleFor(room, user?.id || null, typeof hello.link === 'string' ? hello.link : null, typeof hello.password === 'string' ? hello.password : null);
      if (!role) { ws.send(JSON.stringify({ type: 'error', error: 'Access denied, expired or revoked. A password may be required.' })); ws.close(4003, 'Denied'); return; }
      ws.serializeAttachment({ ...a, role, user: user?.id || null, link: hello.link || null } satisfies Attachment);
      ws.send(JSON.stringify({ type: 'welcome', role, peer: a.peer }));
      const rows = this.sql.exec('SELECT kind, data FROM updates ORDER BY seq').toArray() as { kind: number; data: ArrayBuffer }[];
      for (const row of rows) { const data = new Uint8Array(row.data), frame = new Uint8Array(data.length + 1); frame[0] = row.kind; frame.set(data, 1); ws.send(frame); }
      ws.send(JSON.stringify({ type: 'synced', updates: rows.filter(r => r.kind === SCENE).length }));
      return;
    }
    if (!a.role) { ws.close(4000, 'Hello first'); return; }
    const bytes = new Uint8Array(message), kind = bytes[0]!, data = bytes.slice(1);
    if ((kind === SCENE || kind === COMPACT) && rank[a.role] < rank.editor) { ws.send(JSON.stringify({ type: 'error', error: 'You can view this drawing but not edit it' })); return; }
    if (kind === COMMENT && rank[a.role] < rank.commenter) { ws.send(JSON.stringify({ type: 'error', error: 'You cannot comment on this drawing' })); return; }
    if (kind === COMPACT) { this.ctx.storage.transactionSync(() => { this.sql.exec('DELETE FROM updates WHERE kind = ?', SCENE); this.sql.exec('INSERT INTO updates (kind, data) VALUES (?, ?)', SCENE, data); }); return; }
    if (kind === SCENE || kind === COMMENT) this.sql.exec('INSERT INTO updates (kind, data) VALUES (?, ?)', kind, data);
    else if (kind !== PRESENCE) return;
    for (const peer of this.peers()) if (peer !== ws) peer.send(bytes);
  }
  async webSocketClose(ws: WebSocket) { const a = ws.deserializeAttachment() as Attachment; for (const peer of this.peers()) if (peer !== ws) peer.send(JSON.stringify({ type: 'left', peer: a.peer })); }
}
function cors(response: Response, origin: string | null): Response {
  if (response.status === 101 || !origin) return response;
  const out = new Response(response.body, response); out.headers.set('Access-Control-Allow-Origin', origin); out.headers.set('Vary', 'Origin'); return out;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url), origin = request.headers.get('origin'), allowed = env.ALLOWED_ORIGIN.split(',').map(s => s.trim());
    if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin || '', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Link-Token, X-Link-Password', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
    const parts = url.pathname.split('/');
    if (parts[1] === 'collab' && /^[\w-]{1,80}$/.test(parts[2] || '')) {
      if (!origin) return json({ error: 'Origin required' }, 403);
      return env.ROOMS.get(env.ROOMS.idFromName(parts[2]!)).fetch(request);
    }
    if (parts[1] === 'api' && parts[2] === 'rooms' && parts[4] === 'assets' && /^[\w-]{1,80}$/.test(parts[3] || '')) return cors(await env.ROOMS.get(env.ROOMS.idFromName(parts[3]!)).fetch(request), origin);
    if (parts[1] === 'api') return cors(await env.DIRECTORY.get(env.DIRECTORY.idFromName('directory')).fetch(request), origin);
    return json({ error: 'Not found' }, 404);
  },
};
