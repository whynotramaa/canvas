import { expect, test } from 'bun:test';
import { outlinePage } from './outline';
import type { SceneElement } from '../schema';
test('outline preserves stacking positions, names arrow endpoints, and keeps every item reachable by pages and search', () => {
 const node: SceneElement={id:'api',type:'rectangle',text:'API',x:0,y:0,width:10,height:10,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
 const elements: SceneElement[]=Array.from({length:251},(_,i)=>({...node,id:String(i),text:'Node '+i}));elements.push(node,{...node,id:'edge',type:'arrow',text:'Request',startBinding:'api',endBinding:'0'});
 expect(outlinePage(elements,'',0).items).toHaveLength(100);expect(outlinePage(elements,'',99).items.at(-1)?.index).toBe(252);
 expect(outlinePage(elements,'connects api',0).items[0]?.description).toBe('Request, connects API to Node 0');
 expect(outlinePage(elements,'missing',2)).toMatchObject({total:0,current:0,pages:1});
});
