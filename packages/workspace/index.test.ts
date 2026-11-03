import { expect, test } from 'bun:test';
import { ancestors, createEntry, createWorkspace, emptyDrawing, expireTrash, isTrashed, moveEntries, searchWorkspace, trashEntries, validateWorkspace } from './index';
test('nested folders reject cycles and restore descendants with ancestors', () => {
  let w = createWorkspace(); const a = createEntry('folder', 'Architecture'), b = createEntry('folder', 'Backend', a.id);
  w.entries.push(a, b); w = moveEntries(w, [w.currentId], b.id);
  expect(ancestors(w, w.currentId).map(e => e.title)).toEqual(['Architecture', 'Backend']);
  expect(() => moveEntries(w, [a.id], b.id)).toThrow();
  w = trashEntries(w, [a.id]); expect(isTrashed(w, w.entries[0]!)).toBe(true);
  expect(searchWorkspace(w, '')).toHaveLength(0);
  w = trashEntries(w, [w.currentId], true); expect(isTrashed(w, w.entries[0]!)).toBe(false);
  expect(validateWorkspace(JSON.parse(JSON.stringify(w)))).toEqual(w);
});
test('expiry removes descendants and text search finds element', () => {
  let w = createWorkspace(); const folder = createEntry('folder', 'Old'); folder.deleted = 1; w.entries.push(folder); w = moveEntries(w, [w.currentId], null);
  w.entries[0]!.parentId = folder.id;
  expect(expireTrash(w, 31 * 86400000).entries).toHaveLength(0);
  w = createWorkspace(emptyDrawing());
  w.drawings[w.currentId]!.elements.push({ id: 'text', type: 'text', x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null, text: 'Kafka checkout' } as any);
  expect(searchWorkspace(w, 'checkout')[0]?.elementId).toBe('text');
});

test('workspace validation rejects corrupt history and cyclic parents', () => {
  const w = createWorkspace(); const folder = createEntry('folder', 'Cycle'); folder.parentId = folder.id; w.entries.push(folder);
  expect(() => validateWorkspace(w)).toThrow('cycle');
  w.entries.pop(); (w.drawings[w.currentId]!.history as any).past = [{}];
  expect(() => validateWorkspace(w)).toThrow();
});
test('named styles validate paint fields and identifiers before persistence',()=>{const w=createWorkspace();w.styles=[{id:'style',name:'Service',style:{color:'#6558d3',fillStyle:'hachure'}}];expect(validateWorkspace(w).styles).toHaveLength(1);expect(()=>validateWorkspace({...w,styles:[...w.styles!,...w.styles!]})).toThrow('style');expect(()=>validateWorkspace({...w,styles:[{id:'unsafe',name:'Bad',style:{gradient:{start:'url(https://evil.invalid)',end:'#fff'}}}]})).toThrow();});
