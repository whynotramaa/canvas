import type {SceneElement} from '../schema';
import {elementOutline,hitTest,rotatePoint} from './geometry';
import {refreshBindings} from './connectors';
const isContainer=(e:SceneElement)=>e.type==='frame'||(e.type==='rectangle'&&e.container);
export function containElements(elements:SceneElement[],id:string):SceneElement[]{
 const container=elements.find(e=>e.id===id);if(!container||container.locked||!['frame','rectangle'].includes(container.type))return elements;
 const ancestors=new Set<string>([id]);let parent=container.frameId;
 while(parent&&!ancestors.has(parent)){ancestors.add(parent);parent=elements.find(e=>e.id===parent)?.frameId||null;}
 return elements.map(e=>e.id===id?{...e,container:true}:!ancestors.has(e.id)&&!e.frameId&&!e.locked&&!e.hidden&&elementOutline(e).every(outline=>outline.points.every(([x,y])=>hitTest(container,x,y,0)))?{...e,frameId:id}:e);
}
export function fitContainers(elements:SceneElement[]):SceneElement[]{
 if(!elements.some(e=>isContainer(e)&&e.autoSize&&!e.locked))return elements;
 const byId=new Map(elements.map(e=>[e.id,e])),children=new Map<string,string[]>();
 for(const e of elements)if(e.frameId&&!e.badge&&byId.has(e.frameId)){const siblings=children.get(e.frameId);if(siblings)siblings.push(e.id);else children.set(e.frameId,[e.id]);}
 const pending=new Map(elements.map(e=>[e.id,children.get(e.id)?.length||0])),queue=elements.filter(e=>!pending.get(e.id)).map(e=>e.id),result=new Map<string,SceneElement>();
 for(let index=0;index<queue.length;index++){
  const e=byId.get(queue[index]!)!,content=(children.get(e.id)||[]).map(id=>result.get(id)!).filter(child=>!child.hidden);let next=e;
  if(isContainer(e)&&e.autoSize&&!e.locked&&content.length){
   const centre={x:e.x+e.width/2,y:e.y+e.height/2},extent={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
   for(const child of content)for(const outline of elementOutline(child))for(const[x,y]of outline.points){const p=rotatePoint({x,y},centre,-e.rotation);extent.minX=Math.min(extent.minX,p.x);extent.minY=Math.min(extent.minY,p.y);extent.maxX=Math.max(extent.maxX,p.x);extent.maxY=Math.max(extent.maxY,p.y);}
   const left=extent.minX-24,top=extent.minY-48,width=extent.maxX-left+24,height=extent.maxY-top+24,mid=rotatePoint({x:left+width/2,y:top+height/2},centre,e.rotation),x=mid.x-width/2,y=mid.y-height/2;
   if(Math.abs(x-e.x)+Math.abs(y-e.y)+Math.abs(width-e.width)+Math.abs(height-e.height)>.001)next={...e,x,y,width,height};
  }
  result.set(e.id,next);
  if(e.frameId&&!e.badge&&pending.has(e.frameId)){const remaining=pending.get(e.frameId)!-1;pending.set(e.frameId,remaining);if(!remaining)queue.push(e.frameId);}
 }
 if(result.size!==elements.length)throw new Error('Container hierarchy contains a cycle');
 const next=elements.map(e=>result.get(e.id)!);return next.every((e,i)=>e===elements[i])?elements:refreshBindings(elements,next);
}
export function placeInContainer(elements:SceneElement[],id:string):SceneElement[]{
 const element=elements.find(e=>e.id===id);if(!element||element.frameId||element.badge)return elements;const outline=elementOutline(element),parents=elements.filter(e=>e.id!==id&&isContainer(e)&&!e.hidden&&!e.locked&&outline.every(part=>part.points.every(([x,y])=>hitTest(e,x,y,0)))).sort((a,b)=>Math.abs(a.width*a.height)-Math.abs(b.width*b.height));const parent=parents[0];return parent?elements.map(e=>e.id===id?{...e,frameId:parent.id}:e):elements;
}
