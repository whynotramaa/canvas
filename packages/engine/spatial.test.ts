import { expect,test } from 'bun:test';
import { SpatialIndex,visualBounds } from './spatial';
import type { SceneElement } from '../schema';
const a:SceneElement={id:'a',type:'rectangle',x:0,y:0,width:100,height:20,rotation:90,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
test('index handles rotated shapes, stroke excursions, updates, hiding, and stacking',()=>{
 const index=new SpatialIndex(),b={...a,id:'b',rotation:0};index.update([a,b]);expect(index.search({minX:40,minY:45,maxX:60,maxY:50}).map(e=>e.id)).toEqual(['a']);
 index.update([{...b,color:'#ffffff'},a]);expect(index.search({minX:-100,minY:-100,maxX:200,maxY:200}).map(e=>e.id)).toEqual(['b','a']);
 index.update([{...a,x:1000}, {...b,hidden:true}]);expect(index.search({minX:0,minY:0,maxX:100,maxY:100})).toEqual([]);
 expect(visualBounds({...a,type:'pen',rotation:0,points:[[0,0],[1000,-500]]}).minY).toBeLessThan(-500);
 index.update([]);expect(index.search({minX:-1e5,minY:-1e5,maxX:1e5,maxY:1e5})).toEqual([]);
});

test('multipoint connectors, flips, wide strokes and labels remain visible to culling and export bounds',()=>{
 const e={id:'line',type:'line' as const,x:0,y:0,width:20,height:20,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,points:[[0,0],[300,200],[20,20]] as [number,number][],flipX:true,strokeWidth:100};
 const box=visualBounds(e);expect(box.minX).toBeLessThan(-280);expect(box.maxY).toBeGreaterThan(200);const index=new SpatialIndex();index.update([e]);expect(index.search({minX:-290,minY:190,maxX:-270,maxY:210})).toEqual([e]);
});
test('same-size scene replacement removes stale index entries',()=>{
 const index=new SpatialIndex();index.update([a]);const replacement={...a,id:'replacement',x:2000};index.update([replacement]);expect(index.search({minX:-100,minY:-100,maxX:200,maxY:200})).toHaveLength(0);expect(index.search(visualBounds(replacement))).toEqual([replacement]);
});
