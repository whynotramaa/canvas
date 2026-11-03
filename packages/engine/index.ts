import * as Y from 'yjs';
import {createScene,SCENE_VERSION,type Scene,type SceneElement}from'../schema';
import{parseDrawing}from'../schema/validation';
export const LOCAL_ORIGIN=Symbol('local editing');
function freezeJson<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeJson(child);Object.freeze(value);}return value;}
export class SceneStore{
 readonly doc=new Y.Doc();
 private readonly elements=this.doc.getMap<Y.Map<unknown>>('elementMap');
 private readonly order=this.doc.getArray<string>('order');
 private readonly metadata=this.doc.getMap<string>('metadata');
 private readonly cache=new Map<string,{fields:Y.Map<unknown>;element:SceneElement}>();
 private readonly fieldIds=new WeakMap<object,string>();
 private readonly validated=new WeakSet<SceneElement>();
 private positions=new Map<string,number>();private orderIds:string[]=[];private snapshot:Scene;
 constructor(scene:Scene=createScene()){
  parseDrawing(scene);this.doc.transact(()=>{this.metadata.set('id',scene.id);this.metadata.set('version',String(SCENE_VERSION));this.setElements(scene.elements);},LOCAL_ORIGIN);
  this.snapshot=this.read();this.doc.on('afterTransaction',(transaction:Y.Transaction)=>{this.snapshot=this.read(transaction);});
 }
 private readElement(id:string):SceneElement|null{
  const fields=this.elements.get(id);if(!fields)return null;this.fieldIds.set(fields,id);const element=freezeJson(fields.toJSON()as SceneElement);this.cache.set(id,{fields,element});this.validated.add(element);return element;
 }
 private read(transaction?:Y.Transaction):Scene{
  const direct=new Set<object>(transaction?.changed.keys()),changed=new Set<object>(transaction?.changedParentTypes.keys());
  if(transaction&&this.snapshot&&!direct.has(this.order)&&!direct.has(this.elements)){
   const changes=new Set<string>();for(const type of changed){const id=this.fieldIds.get(type);if(id)changes.add(id);}
   let elements=this.snapshot.elements;if(changes.size){elements=elements.slice();for(const id of changes){const index=this.positions.get(id),element=this.readElement(id);if(index!==undefined&&element)elements[index]=element;}}
   Object.freeze(elements);return Object.freeze({version:SCENE_VERSION,id:this.metadata.get('id')!,elements});
  }
  this.orderIds=this.order.toArray();const seen=new Set<string>(),elements:SceneElement[]=[];this.positions.clear();
  for(const id of this.orderIds){if(seen.has(id)||!this.elements.has(id))continue;seen.add(id);const cached=this.cache.get(id),fields=this.elements.get(id)!;const element=cached?.fields===fields&&!changed.has(fields)?cached.element:this.readElement(id)!;this.positions.set(id,elements.length);elements.push(element);}
  for(const id of this.cache.keys())if(!this.elements.has(id))this.cache.delete(id);
  Object.freeze(elements);return Object.freeze({version:SCENE_VERSION,id:this.metadata.get('id')!,elements});
 }
 getSnapshot=():Scene=>this.snapshot;
 subscribe=(listener:()=>void):(()=>void)=>{this.doc.on('afterTransaction',listener);return()=>this.doc.off('afterTransaction',listener);};
 transact(action:()=>void,origin:unknown=LOCAL_ORIGIN):void{this.doc.transact(action,origin);}
 add(element:SceneElement):void{this.setElements([...this.order.toArray().flatMap(id=>{const fields=this.elements.get(id);return fields?[fields.toJSON()as SceneElement]:[];}),element]);}
 setElements(next:SceneElement[],origin:unknown=LOCAL_ORIGIN):void{
  const changed=next.filter(e=>!this.validated.has(e));parseDrawing({version:SCENE_VERSION,elements:changed});for(const element of changed)JSON.stringify(element);
  const orderChanged=next.length!==this.orderIds.length||next.some((e,index)=>e.id!==this.orderIds[index]);
  if(!orderChanged&&!changed.length)return;
  const ids=new Set<string>();let membershipChanged=false;if(orderChanged){membershipChanged=next.length!==this.elements.size;for(const e of next){if(ids.has(e.id))throw new Error('Duplicate element ID');ids.add(e.id);if(!this.elements.has(e.id))membershipChanged=true;}}
  this.doc.transact(()=>{
   if(membershipChanged)for(const id of this.elements.keys())if(!ids.has(id))this.elements.delete(id);
   for(const element of next){if(this.cache.get(element.id)?.element===element)continue;let fields=this.elements.get(element.id);if(!fields){fields=new Y.Map();this.elements.set(element.id,fields);this.fieldIds.set(fields,element.id);}for(const key of fields.keys())if(!(key in element)||element[key as keyof SceneElement]===undefined)fields.delete(key);for(const[key,value]of Object.entries(element))if(value!==undefined&&JSON.stringify(fields.get(key))!==JSON.stringify(value))fields.set(key,value);}
   if(orderChanged){this.order.delete(0,this.order.length);this.order.insert(0,next.map(e=>e.id));}
  },origin);
 }
 destroy():void{this.doc.destroy();}
}
