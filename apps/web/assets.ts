import {materializeHistory} from './history-pages';
import {readHistoryPage} from './storage';
const bitmaps = new Map<string, ImageBitmap>();
const loading = new Map<string, Promise<ImageBitmap>>();
export function cachedImage(id: string): ImageBitmap | undefined { return bitmaps.get(id); }
export async function loadImage(id: string): Promise<ImageBitmap> {
  if (!/^[\w-]+$/.test(id)) throw new Error('Invalid asset identifier');
  if (bitmaps.has(id)) return bitmaps.get(id)!;
  if (loading.has(id)) return loading.get(id)!;
  const promise = (async () => { const root = await navigator.storage.getDirectory(); const file = await (await root.getFileHandle(id)).getFile(); const bitmap = await createImageBitmap(file); bitmaps.set(id, bitmap); return bitmap; })();
  loading.set(id, promise);
  try { return await promise; } finally { loading.delete(id); }
}
export async function storeImage(file: File): Promise<{ id: string; width: number; height: number }> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image under 10 MB');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 12000 || bitmap.height > 12000 || bitmap.width * bitmap.height > 25000000) { bitmap.close(); throw new Error('Image exceeds 25 megapixels or 12,000 pixels per side'); }
  const id = crypto.randomUUID();
  let root: FileSystemDirectoryHandle | undefined;
  try { root = await navigator.storage.getDirectory(); const handle = await root.getFileHandle(id, { create: true }); const writer = await handle.createWritable(); try { await writer.write(file); await writer.close(); } catch (error) { await writer.abort().catch(() => {}); throw error; } }
  catch (error) { bitmap.close(); await root?.removeEntry(id).catch(() => {}); throw error; }
  bitmaps.set(id, bitmap); return { id, width: bitmap.width, height: bitmap.height };
}

import { validateWorkspace, type Workspace } from '../../packages/workspace';
function allElements(workspace: Workspace) {
  return [...(workspace.components||[]).flatMap(c=>c.elements),...Object.values(workspace.drawings).flatMap(d => [...d.elements, ...d.history.past.flatMap(e => [...e.before, ...e.after]), ...d.history.future.flatMap(e => [...e.before, ...e.after]), ...(d.snapshots || []).flatMap(s => s.elements)])];
}
export async function portableWorkspace(workspace: Workspace): Promise<Workspace & { assetBlobs: Record<string, string> }> {
  workspace=await materializeHistory(workspace,readHistoryPage);
  const assetBlobs: Record<string, string> = {};
  const ids=new Set(allElements(workspace).flatMap(e=>e.assetId?[e.assetId]:[]));if(!ids.size)return{...workspace,assetBlobs};
  const root = await navigator.storage.getDirectory();
  for (const id of ids) {
    if (!/^[\w-]+$/.test(id)) throw new Error('Invalid asset identifier');
    const file = await (await root.getFileHandle(id)).getFile();
    const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    assetBlobs[id] = btoa(binary);
  }
  return { ...workspace, assetBlobs };
}
export async function restorePortableWorkspace(input: unknown): Promise<Workspace> {
  const workspace = structuredClone(validateWorkspace(input));
  if(Object.values(workspace.drawings).some(d=>d.history.pastPages?.length||d.history.futurePages?.length))throw new Error('Import requires a portable backup with materialized undo history');
  const assetBlobs = (input as { assetBlobs?: Record<string, string> }).assetBlobs;
  const refs = new Set(allElements(workspace).flatMap(e => e.assetId ? [e.assetId] : []));
  const remap = new Map<string, string>(); let total = 0;
  for (const id of refs) {
    const encoded = assetBlobs?.[id];
    if (typeof encoded !== 'string') { await loadImage(id); continue; }
    total += encoded.length;
    if (encoded.length > 14 * 1024 * 1024 || total > 140 * 1024 * 1024) throw new Error('Backup assets exceed import limit');
    const binary = atob(encoded), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const asset = await storeImage(new File([bytes], 'restored-image', { type: 'image/png' }));
    remap.set(id, asset.id);
  }
  for (const element of allElements(workspace)) if (element.assetId && remap.has(element.assetId)) element.assetId = remap.get(element.assetId)!;
  delete (workspace as Workspace & { assetBlobs?: unknown }).assetBlobs;
  return workspace;
}
