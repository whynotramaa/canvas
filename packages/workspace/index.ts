import {validateComponents,type ComponentDefinition} from './components';
import {parseStyle,type NamedStyle} from '../schema/style';
import {backdrops,type CanvasSettings}from'../engine/navigation';
import type { Snapshot } from './snapshots';
import { parseDrawing } from '../schema/validation';
import type { SceneElement } from '../schema';
import { validateHistory, type History } from '../engine/history';
export interface Entry { template?:boolean; thumbnail?:string; emoji?:string; id: string; kind: 'drawing' | 'folder'; title: string; parentId: string | null; tags: string[]; starred: boolean; created: number; modified: number; deleted: number | null }
export interface Drawing { version: 1; elements: SceneElement[]; history: History; original?: unknown; source?: string; snapshots?: Snapshot[]; settings?:CanvasSettings }
export interface Workspace { styles?:NamedStyle[];components?:ComponentDefinition[]; version: 1; currentId: string; entries: Entry[]; drawings: Record<string, Drawing> }
export function createEntry(kind: Entry['kind'], title: string, parentId: string | null = null): Entry {
  const now = Date.now();
  return { id: crypto.randomUUID(), kind, title: title.trim() || 'Untitled', parentId, tags: [], starred: false, created: now, modified: now, deleted: null };
}
export function emptyDrawing(): Drawing { return { version: 1, elements: [], history: { past: [], future: [] } }; }
export function createWorkspace(legacy = emptyDrawing()): Workspace {
  const entry = createEntry('drawing', 'Untitled drawing');
  return { version: 1, currentId: entry.id, entries: [entry], drawings: { [entry.id]: legacy } };
}
export function ancestors(workspace: Workspace, id: string): Entry[] {
  const result: Entry[] = [], seen = new Set<string>();
  let item = workspace.entries.find(e => e.id === id);
  while (item?.parentId) {
    if (seen.has(item.parentId)) throw new Error('Folder cycle');
    seen.add(item.parentId);
    item = workspace.entries.find(e => e.id === item!.parentId);
    if (item) result.unshift(item);
  }
  return result;
}
export function isTrashed(workspace: Workspace, entry: Entry): boolean { return entry.deleted !== null || ancestors(workspace, entry.id).some(e => e.deleted !== null); }
export function moveEntries(workspace: Workspace, ids: string[], parentId: string | null): Workspace {
  if (parentId && !workspace.entries.some(e => e.id === parentId && e.kind === 'folder' && !isTrashed(workspace, e))) throw new Error('Destination folder is unavailable');
  if (parentId && (ids.includes(parentId) || ancestors(workspace, parentId).some(e => ids.includes(e.id)))) throw new Error('Cannot move a folder into itself');
  return { ...workspace, entries: workspace.entries.map(e => ids.includes(e.id) ? { ...e, parentId, modified: Date.now() } : e) };
}
export function trashEntries(workspace: Workspace, ids: string[], restore = false): Workspace {
  const restoring = new Set(ids);
  if (restore) for (const id of ids) for (const parent of ancestors(workspace, id)) restoring.add(parent.id);
  return { ...workspace, entries: workspace.entries.map(e => restoring.has(e.id) ? { ...e, deleted: restore ? null : Date.now() } : e) };
}
export function expireTrash(workspace: Workspace, now = Date.now()): Workspace {
  const expired = new Set(workspace.entries.filter(e => [e, ...ancestors(workspace, e.id)].some(p => p.deleted !== null && now - p.deleted >= 30 * 86400000)).map(e => e.id));
  return { ...workspace, entries: workspace.entries.filter(e => !expired.has(e.id)), drawings: Object.fromEntries(Object.entries(workspace.drawings).filter(([id]) => !expired.has(id))) };
}
export {searchWorkspace} from './search';
export function validateWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace');
  const w = value as Workspace;
  if (w.version !== 1 || !Array.isArray(w.entries) || !w.drawings || typeof w.drawings !== 'object' || typeof w.currentId !== 'string') throw new Error('Invalid workspace');
  if(w.components!==undefined)validateComponents(w.components);
  if(w.styles!==undefined){if(!Array.isArray(w.styles)||w.styles.length>200)throw new Error('Invalid named styles');const styleIds=new Set<string>();for(const style of w.styles){if(!style||typeof style.id!=='string'||!style.id||styleIds.has(style.id)||typeof style.name!=='string'||!style.name)throw new Error('Invalid named style');styleIds.add(style.id);parseStyle(style.style);}}
  const ids = new Set<string>();
  for (const e of w.entries) {
    if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) || !['drawing', 'folder'].includes(e.kind) || typeof e.title !== 'string' || !Array.isArray(e.tags) || !e.tags.every(t => typeof t === 'string') || typeof e.starred !== 'boolean' || !Number.isFinite(e.created) || !Number.isFinite(e.modified) || (e.deleted !== null && !Number.isFinite(e.deleted)) || (e.parentId !== null && typeof e.parentId !== 'string')) throw new Error('Invalid workspace entry');
    if(e.template!==undefined&&typeof e.template!=='boolean')throw new Error('Invalid template flag');
    if(e.emoji!==undefined&&typeof e.emoji!=='string')throw new Error('Invalid drawing icon');
    if(e.thumbnail!==undefined&&(typeof e.thumbnail!=='string'||(!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(e.thumbnail)||e.thumbnail.length>200000)))throw new Error('Invalid thumbnail');
    ids.add(e.id);
  }
  for(const id of Object.keys(w.drawings))if(!w.entries.some(e=>e.id===id&&e.kind==='drawing'))throw new Error('Drawing has no workspace entry');
  for (const e of w.entries) {
    if (e.parentId && !w.entries.some(p => p.id === e.parentId && p.kind === 'folder')) throw new Error('Missing parent folder');
    ancestors(w, e.id);
    if (e.kind === 'drawing') {
      const drawing = w.drawings[e.id]; parseDrawing(drawing);
      if(drawing.settings){const s=drawing.settings;if(s.clean!==undefined&&typeof s.clean!=='boolean')throw new Error('Invalid drawing clean mode');if(!backdrops.includes(s.backdrop)||!Number.isFinite(s.gridSize)||s.gridSize<4||s.gridSize>200||!Number.isFinite(s.opacity)||s.opacity<0||s.opacity>1||typeof s.snapping!=='boolean'||typeof s.gridSnap!=='boolean')throw new Error('Invalid canvas settings');}
      if (drawing.source !== undefined && typeof drawing.source !== 'string') throw new Error('Invalid diagram source');
      if (drawing.snapshots !== undefined) { if (!Array.isArray(drawing.snapshots)) throw new Error('Invalid snapshots'); for (const snapshot of drawing.snapshots) { if (typeof snapshot.id !== 'string' || typeof snapshot.name !== 'string' || !Number.isFinite(snapshot.created)) throw new Error('Invalid snapshot'); parseDrawing({ version: 1, elements: snapshot.elements }); } }
      validateHistory(drawing.history);
    }
  }
  return w;
}
