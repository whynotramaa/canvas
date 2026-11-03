import type { SceneElement } from '../schema';
import { bounds, intersects,elementOutline,pointInPolygon,segmentsIntersect } from './geometry';
import { moveWithBindings } from './transforms';
export function selectionClosure(elements: SceneElement[], selected: string[]): string[] {
  const ids=new Set(selected), groups=new Set(elements.filter(e=>ids.has(e.id)).flatMap(e=>e.groupIds));
  let changed=true;
  while(changed){changed=false;for(const e of elements) if(!ids.has(e.id) && ((e.frameId && ids.has(e.frameId)) || e.groupIds.some(g=>groups.has(g)))){ids.add(e.id);changed=true;}}
  return [...ids];
}
export function selectArea(elements: SceneElement[], points: [number,number][], lasso: boolean): string[] {
  if(points.length<2)return[];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]); const box={minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)};
  if(lasso&&points.length<3)return[];
  const region=lasso?points:[[box.minX,box.minY],[box.maxX,box.minY],[box.maxX,box.maxY],[box.minX,box.maxY]];
  return elements.filter(e=>!e.locked&&!e.hidden).filter(e=>elementOutline(e).some(outline=>{
    if(outline.points.some(([x,y])=>pointInPolygon(x,y,region)))return true;
    if(outline.closed&&region.some(([x,y])=>pointInPolygon(x!,y!,outline.points)))return true;
    const count=outline.closed?outline.points.length:outline.points.length-1;
    for(let i=0;i<count;i++)for(let j=0;j<region.length;j++)if(segmentsIntersect(outline.points[i]!,outline.points[(i+1)%outline.points.length]!,region[j]!,region[(j+1)%region.length]!))return true;
    return false;
  })).map(e=>e.id);
}
export function cloneSelection(elements: SceneElement[], selected: string[], dx=20,dy=20): SceneElement[] {
  const ids=new Set(selectionClosure(elements,selected));
  for(const e of elements)if(e.startBinding&&e.endBinding&&ids.has(e.startBinding)&&ids.has(e.endBinding))ids.add(e.id);
  const mapping=new Map([...ids].map(id=>[id,crypto.randomUUID()])),instances=new Map<string,string>(),groups=new Map<string,string>();
  return elements.filter(e=>ids.has(e.id)).map(e=>({...e,component:e.component?{...e.component,instanceId:(()=>{if(!instances.has(e.component!.instanceId)){const id=crypto.randomUUID();instances.set(e.component!.instanceId,id);groups.set(e.component!.instanceId,id);}return instances.get(e.component!.instanceId)!;})()}:undefined,id:mapping.get(e.id)!,x:e.x+dx,y:e.y+dy,points:e.points?.map(([x,y])=>[x+dx,y+dy]),groupIds:e.groupIds.map(g=>{if(!groups.has(g))groups.set(g,crypto.randomUUID());return groups.get(g)!;}),frameId:e.frameId?mapping.get(e.frameId)||null:null,startBinding:e.startBinding?mapping.get(e.startBinding)||null:null,endBinding:e.endBinding?mapping.get(e.endBinding)||null:null}));
}
export function alignElements(elements: SceneElement[], selected: string[], mode: 'left'|'right'|'top'|'bottom'|'center'|'middle'|'horizontal'|'vertical'): SceneElement[] {
  const ids=new Set(selected),nodes=elements.filter(e=>ids.has(e.id)&&!e.locked&&!['arrow','line'].includes(e.type));if(nodes.length<2)return elements;
  const boxes=nodes.map(bounds),left=Math.min(...boxes.map(b=>b.minX)),right=Math.max(...boxes.map(b=>b.maxX)),top=Math.min(...boxes.map(b=>b.minY)),bottom=Math.max(...boxes.map(b=>b.maxY));let result=elements;
  if(mode==='horizontal'||mode==='vertical'){
    const horizontal=mode==='horizontal',sorted=[...nodes].sort((a,b)=>(horizontal?bounds(a).minX:bounds(a).minY)-(horizontal?bounds(b).minX:bounds(b).minY));
    const span=horizontal?right-left:bottom-top,total=nodes.reduce((sum,e)=>sum+(horizontal?Math.abs(e.width):Math.abs(e.height)),0),gap=(span-total)/(nodes.length-1);let cursor=horizontal?left:top;
    for(const e of sorted){const b=bounds(e);result=moveWithBindings(result,new Set([e.id]),horizontal?cursor-b.minX:0,horizontal?0:cursor-b.minY);cursor+=(horizontal?Math.abs(e.width):Math.abs(e.height))+gap;}
  }else for(const e of nodes){const b=bounds(e);const dx=mode==='left'?left-b.minX:mode==='right'?right-b.maxX:mode==='center'?(left+right-b.minX-b.maxX)/2:0,dy=mode==='top'?top-b.minY:mode==='bottom'?bottom-b.maxY:mode==='middle'?(top+bottom-b.minY-b.maxY)/2:0;result=moveWithBindings(result,new Set([e.id]),dx,dy);}
  return result;
}
