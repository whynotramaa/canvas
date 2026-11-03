import {bounds} from './geometry';
import type { SceneElement } from '../schema';
export const backdrops=['plain','dots','lines','graph','isometric','notebook','blueprint','chalkboard','kraft','warm','grain','vignette'] as const;
export interface CanvasSettings {clean?:boolean;background?:string;backdrop:typeof backdrops[number];gridSize:number;opacity:number;snapping:boolean;gridSnap:boolean}
export const defaultSettings:CanvasSettings={backdrop:'plain',gridSize:24,opacity:.18,snapping:true,gridSnap:false};
export interface SnapGuide {axis:'x'|'y';value:number;kind?:'align'|'spacing'}
export function snapPosition(x:number,y:number,width:number,height:number,elements:SceneElement[],settings:CanvasSettings,tolerance=8){
 const guides:SnapGuide[]=[];
 if(settings.gridSnap){const g=settings.gridSize;if(settings.backdrop==='isometric'){const u=Math.round(x/g+y/(g*Math.sqrt(3))),v=Math.round(x/g-y/(g*Math.sqrt(3)));return{x:(u+v)*g/2,y:(u-v)*g*Math.sqrt(3)/2,guides};}return{x:Math.round(x/g)*g,y:Math.round(y/g)*g,guides};}
 if(!settings.snapping)return{x,y,guides};
 const boxes=elements.filter(e=>!e.hidden&&!['arrow','line','pen'].includes(e.type)).map(bounds);
 let bestX=tolerance,bestY=tolerance,dx=0,dy=0;
 const offer=(axis:'x'|'y',delta:number,value:number,kind:'align'|'spacing')=>{if(Math.abs(delta)>=(axis==='x'?bestX:bestY))return;if(axis==='x'){bestX=Math.abs(delta);dx=delta;}else{bestY=Math.abs(delta);dy=delta;}const index=guides.findIndex(g=>g.axis===axis);const guide={axis,value,kind};if(index>=0)guides[index]=guide;else guides.push(guide);};
 for(const b of boxes){for(const target of [b.minX,(b.minX+b.maxX)/2,b.maxX])for(const source of [x,x+width/2,x+width])offer('x',target-source,target,'align');for(const target of [b.minY,(b.minY+b.maxY)/2,b.maxY])for(const source of [y,y+height/2,y+height])offer('y',target-source,target,'align');}
 const left=Math.min(x,x+width),right=Math.max(x,x+width),top=Math.min(y,y+height),bottom=Math.max(y,y+height);
 for(const axis of ['x','y']as const){
  const horizontal=axis==='x',min=horizontal?left:top,max=horizontal?right:bottom,otherMin=horizontal?top:left,otherMax=horizontal?bottom:right;
  const neighbors=boxes.filter(b=>(horizontal?b.minY:b.minX)<=otherMax&&(horizontal?b.maxY:b.maxX)>=otherMin).map(b=>({min:horizontal?b.minX:b.minY,max:horizontal?b.maxX:b.maxY}));
  const before=neighbors.filter(b=>b.max<=min+tolerance).sort((a,b)=>b.max-a.max),after=neighbors.filter(b=>b.min>=max-tolerance).sort((a,b)=>a.min-b.min);
  if(before[0]&&after[0]){const desired=(before[0].max+after[0].min-(max-min))/2;offer(axis,desired-min,desired+(max-min)/2,'spacing');}
  if(before[0]&&before[1]){const gap=before[0].min-before[1].max;if(gap>=0){const desired=before[0].max+gap;offer(axis,desired-min,desired,'spacing');}}
  if(after[0]&&after[1]){const gap=after[1].min-after[0].max;if(gap>=0){const desired=after[0].min-gap;offer(axis,desired-max,desired,'spacing');}}
 }
 return{x:x+dx,y:y+dy,guides};
}
export function zoomAt(view:{x:number;y:number;zoom:number},factor:number,x:number,y:number){const zoom=Math.max(.01,Math.min(30,view.zoom*factor));return{zoom,x:x-(x-view.x)*zoom/view.zoom,y:y-(y-view.y)*zoom/view.zoom};}
