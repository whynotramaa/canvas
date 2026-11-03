import { expect, test } from 'bun:test';
import { moveWithBindings, layoutGrid } from './transforms';
import type { SceneElement } from '../schema';
const a: SceneElement = { id: 'a', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
test('moving bound nodes updates only attached connector endpoints', () => {
  const b = { ...a, id: 'b', x: 200 }, edge = { ...a, id: 'edge', type: 'arrow' as const, x: 25, y: 25, width: 200, height: 0, startBinding: 'a', endBinding: 'b' };
  const moved = moveWithBindings([a,b,edge], new Set(['a']), 20, 30)[2]!;
  expect([moved.x, moved.y, moved.width, moved.height]).toEqual([45,55,180,-30]);
  expect(moved.x + moved.width).toBe(225);
  const layout = layoutGrid([a,b,edge], new Set(['a','b']), 1);
  expect(layout[1]!.y).toBeGreaterThan(50);
  expect(layout[2]!.y + layout[2]!.height).toBe(layout[1]!.y + 25);
});
test('locked roots cannot be nudged and do not pull attached connectors',()=>{
 const node={id:'locked',type:'rectangle' as const,x:0,y:0,width:10,height:10,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,locked:true};expect(moveWithBindings([node],new Set(['locked']),10,20)[0]).toBe(node);
});
