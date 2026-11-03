import { expect, test } from 'bun:test';
import { applyEdit, record, type History } from './history';
import type { SceneElement } from '../schema';
const element: SceneElement = { id: 'a', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
test('history stores changed elements and preserves unrelated edits', () => {
  const h: History = { past: [], future: [] };
  record(h, [element], [{ ...element, x: 20 }]);
  const current = [{ ...element, x: 20 }, { ...element, id: 'remote' }];
  expect(applyEdit(current, h.past[0]!, true)).toEqual([element, current[1]!]);
  record(h, [element], [element]);
  expect(h.past).toHaveLength(1);
  const saved = JSON.parse(JSON.stringify(h));
  expect(applyEdit([element], saved.past[0], false)[0]?.x).toBe(20);
});

test('undo restores deleted objects at their original stacking position', () => {
  const h: History = { past: [], future: [] };
  const second = { ...element, id: 'b' };
  record(h, [element, second], [second]);
  expect(applyEdit([second], h.past[0]!, true)).toEqual([element, second]);
});

test('layer-only changes are undoable and later changes to other fields survive undo',()=>{
 const history:History={past:[],future:[]},second={...element,id:'b'};record(history,[element,second],[second,element]);expect(history.past).toHaveLength(1);expect(applyEdit([second,element],history.past[0]!,true).map(e=>e.id)).toEqual(['a','b']);
 record(history,[element],[{...element,x:20}]);const edit=history.past.at(-1)!;expect(applyEdit([{...element,x:20,color:'#ff0000'}],edit,true)[0]).toMatchObject({x:0,color:'#ff0000'});expect(applyEdit([{...element,x:100}],edit,true)[0]?.x).toBe(100);
});

test('geometry edits omit unchanged stacking arrays from the persistent journal',()=>{const h:History={past:[],future:[]};const many=Array.from({length:1000},(_,i)=>({...element,id:String(i)}));record(h,many,many.map((e,i)=>i===10?{...e,x:20}:e));expect(h.past[0]!.before).toHaveLength(1);expect(h.past[0]!.beforeOrder).toEqual([]);expect(applyEdit(many.map((e,i)=>i===10?{...e,x:20}:e),h.past[0]!,true)).toEqual(many);});
