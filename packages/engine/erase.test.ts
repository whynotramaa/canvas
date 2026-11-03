import { expect, test } from 'bun:test';
import type { SceneElement } from '../schema';
import { eraseSweep, removeElements } from './erase';
const node: SceneElement = {id:'node',type:'rectangle',x:50,y:0,width:10,height:20,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
test('a fast eraser sweep catches crossed shapes and respects locked and hidden elements', () => {
 const scene=[node,{...node,id:'locked',locked:true},{...node,id:'hidden',hidden:true}];
 expect(eraseSweep(scene,{x:0,y:10},{x:100,y:10},2)).toEqual(['node']);
 expect(eraseSweep(scene,{x:0,y:40},{x:100,y:40},2)).toEqual([]);
});
test('deletion detaches surviving connectors and frame children without changing unrelated elements', () => {
 const child={...node,id:'child',frameId:'node'},edge={...node,id:'edge',type:'arrow' as const,startBinding:'node',startAnchor:[.5,.5] as [number,number]},other={...node,id:'other'};
 const result=removeElements([node,child,edge,other],new Set(['node']));
 expect(result[0]!.frameId).toBeNull();expect(result[1]!.startBinding).toBeNull();expect(result[1]!.startAnchor).toBeUndefined();expect(result[2]).toBe(other);
});
test('deletion cannot remove a locked target or detach a surviving binding from it',()=>{const locked={...node,locked:true},edge={...node,id:'edge',type:'arrow' as const,startBinding:node.id};const result=removeElements([locked,edge],new Set([node.id]));expect(result).toEqual([locked,edge]);expect(result[1]).toBe(edge);});
