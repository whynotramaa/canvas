import { describe, expect, test } from 'bun:test';
import { SceneStore } from './index';

describe('SceneStore', () => {
  test('publishes one stable snapshot per transaction', () => {
    const store = new SceneStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const before = store.getSnapshot();
    store.transact(() => store.add({ id: 'one', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null }), 'local');
    expect(calls).toBe(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(store.getSnapshot().elements[0]?.id).toBe('one');
    unsubscribe();
  });
});

import * as Y from 'yjs';
test('concurrent geometry and style edits merge at the element field level', () => {
  const scene = { version: 1 as const, id: 'shared', elements: [{ id: 'one', type: 'rectangle' as const, x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null }] };
  const a = new SceneStore(scene), b = new SceneStore({ ...scene, elements: [] });
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
  const av = Y.encodeStateVector(a.doc), bv = Y.encodeStateVector(b.doc);
  a.setElements([{ ...a.getSnapshot().elements[0]!, x: 100 }]);
  b.setElements([{ ...b.getSnapshot().elements[0]!, color: '#ff0000' }]);
  const au = Y.encodeStateAsUpdate(a.doc, bv), bu = Y.encodeStateAsUpdate(b.doc, av);
  Y.applyUpdate(a.doc, bu); Y.applyUpdate(b.doc, au);
  expect(a.getSnapshot().elements).toEqual(b.getSnapshot().elements);
  expect(a.getSnapshot().elements[0]).toMatchObject({ x: 100, color: '#ff0000' });
  a.destroy(); b.destroy();
});

test('unchanged element references are retained and snapshots cannot mutate document state',()=>{
 const store=new SceneStore();const e={id:'a',type:'rectangle' as const,x:0,y:0,width:10,height:10,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};store.setElements([e,{...e,id:'b'}]);const before=store.getSnapshot();expect(Object.isFrozen(before.elements[0]!)).toBe(true);store.setElements(before.elements.map(e=>e.id==='a'?{...e,x:20}:e));const after=store.getSnapshot();expect(after.elements[1]).toBe(before.elements[1]);expect(after.elements[0]).not.toBe(before.elements[0]);expect(()=>{after.elements[0]!.groupIds.push('bad');}).toThrow();expect(()=>store.setElements([after.elements[0]!,after.elements[0]!])).toThrow('Duplicate');store.destroy();
});
test('remote field changes, reorders and deletions invalidate only the affected cached elements',()=>{
 const a=new SceneStore(),b=new SceneStore();const e={id:'a',type:'rectangle' as const,x:0,y:0,width:10,height:10,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
 a.setElements([e,{...e,id:'b'},{...e,id:'c'}]);Y.applyUpdate(b.doc,Y.encodeStateAsUpdate(a.doc));let vector=Y.encodeStateVector(b.doc);const before=b.getSnapshot().elements;
 a.setElements(a.getSnapshot().elements.map(e=>e.id==='b'?{...e,text:'remote label'}:e));Y.applyUpdate(b.doc,Y.encodeStateAsUpdate(a.doc,vector));
 expect(b.getSnapshot().elements[0]).toBe(before[0]);expect(b.getSnapshot().elements[1]?.text).toBe('remote label');expect(b.getSnapshot().elements[2]).toBe(before[2]);
 vector=Y.encodeStateVector(b.doc);a.setElements([...a.getSnapshot().elements].reverse().filter(e=>e.id!=='b'));Y.applyUpdate(b.doc,Y.encodeStateAsUpdate(a.doc,vector));expect(b.getSnapshot().elements.map(e=>e.id)).toEqual(['c','a']);expect(b.getSnapshot().elements[0]).toBe(before[2]);a.destroy();b.destroy();
});
import{benchmarkScene}from'./benchmark-fixtures';
test('benchmark fixtures use deterministic supported geometry and bindings',()=>{
 const scene=benchmarkScene(60);expect(scene).toEqual(benchmarkScene(60));expect(new Set(scene.map(e=>e.id)).size).toBe(60);const store=new SceneStore({version:1,id:'fixture',elements:scene});expect(store.getSnapshot().elements).toHaveLength(60);store.destroy();expect(()=>benchmarkScene(-1)).toThrow();
});
test('multiple adds inside one transaction retain every element and publish once',()=>{
 const store=new SceneStore();let changes=0;store.subscribe(()=>changes++);const e=benchmarkScene(2);store.transact(()=>{store.add(e[0]!);store.add(e[1]!);});expect(store.getSnapshot().elements.map(e=>e.id)).toEqual(e.map(e=>e.id));expect(changes).toBe(1);store.destroy();
});
