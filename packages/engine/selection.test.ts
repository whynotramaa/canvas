import { expect,test } from 'bun:test';
import { alignElements,cloneSelection,selectArea,selectionClosure } from './selection';
import type { SceneElement } from '../schema';
const a:SceneElement={id:'a',type:'rectangle',x:0,y:0,width:20,height:20,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
test('box/lasso exclude locked objects and clones remap internal bindings',()=>{
 const b={...a,id:'b',x:100},edge={...a,id:'edge',type:'arrow' as const,startBinding:'a',endBinding:'b'};
 expect(selectArea([a,{...b,locked:true}], [[-5,-5],[130,30]],false)).toEqual(['a']);
 expect(selectArea([a,b],[[-1,-1],[30,-1],[30,30],[-1,30]],true)).toEqual(['a']);
 const copies=cloneSelection([a,b,edge],['a','b']);expect(copies).toHaveLength(3);expect(copies[2]!.startBinding).toBe(copies[0]!.id);expect(copies[2]!.endBinding).toBe(copies[1]!.id);
 const aligned=alignElements([a,b],['a','b'],'left');expect(aligned[1]!.x).toBe(0);
 const nested=[{...a,type:'frame' as const},{...b,type:'frame' as const,frameId:'a'},{...a,id:'c',frameId:'b'}];expect(selectionClosure(nested,['a'])).toEqual(['a','b','c']);
});
