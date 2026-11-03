import type { SceneElement } from '../schema';
import { shapePath } from './shapes';
import { pointsOnPath } from 'points-on-path';
export interface Bounds { minX:number;minY:number;maxX:number;maxY:number }
export interface Point { x:number;y:number }
export function rotatePoint(point:Point,center:Point,degrees:number):Point{const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),dx=point.x-center.x,dy=point.y-center.y;return{x:center.x+dx*c-dy*s,y:center.y+dx*s+dy*c};}
export function screenToWorld(point:Point,view:Point&{zoom:number}):Point{return{x:(point.x-view.x)/view.zoom,y:(point.y-view.y)/view.zoom};}
export function worldToScreen(point:Point,view:Point&{zoom:number}):Point{return{x:point.x*view.zoom+view.x,y:point.y*view.zoom+view.y};}
function localBounds(e:Pick<SceneElement,'x'|'y'|'width'|'height'>):Bounds{return{minX:Math.min(e.x,e.x+e.width),minY:Math.min(e.y,e.y+e.height),maxX:Math.max(e.x,e.x+e.width),maxY:Math.max(e.y,e.y+e.height)};}
export function bounds(e:Pick<SceneElement,'x'|'y'|'width'|'height'>&Partial<Pick<SceneElement,'rotation'|'points'|'flipX'|'flipY'>>):Bounds{
 const b=localBounds(e);if(!e.rotation&&!e.points?.length)return b;
 const samples=e.points?.length?e.points:[[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]],center={x:e.x+e.width/2,y:e.y+e.height/2};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const[x,y]of samples){const p=rotatePoint({x:e.flipX?2*center.x-x!:x!,y:e.flipY?2*center.y-y!:y!},center,e.rotation||0);minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}return{minX,minY,maxX,maxY};
}
export function selectionBounds(elements:SceneElement[],ids:Set<string>):Bounds|null{let result:Bounds|null=null;for(const e of elements)if(ids.has(e.id)){const b=bounds(e);result=result?{minX:Math.min(result.minX,b.minX),minY:Math.min(result.minY,b.minY),maxX:Math.max(result.maxX,b.maxX),maxY:Math.max(result.maxY,b.maxY)}:b;}return result;}
export function intersects(a:Bounds,b:Bounds):boolean{return a.minX<=b.maxX&&a.maxX>=b.minX&&a.minY<=b.maxY&&a.maxY>=b.minY;}
export function contains(b:Bounds,x:number,y:number,padding=0):boolean{return x>=b.minX-padding&&x<=b.maxX+padding&&y>=b.minY-padding&&y<=b.maxY+padding;}
export function distanceToSegment(x:number,y:number,ax:number,ay:number,bx:number,by:number):number{const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy,t=length===0?0:Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
export function pointInPolygon(x:number,y:number,polygon:readonly(readonly number[])[]):boolean{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i]!,b=polygon[j]!;if((a[1]!>y)!==(b[1]!>y)&&x<(b[0]!-a[0]!)*(y-a[1]!)/(b[1]!-a[1]!)+a[0]!)inside=!inside;}return inside;}
const paths=new Map<string,{path:string;sets:number[][][]}>();
export function hitTest(element:SceneElement,x:number,y:number,padding=8):boolean{
 const p=rotatePoint({x,y},{x:element.x+element.width/2,y:element.y+element.height/2},-element.rotation);x=element.flipX?2*(element.x+element.width/2)-p.x:p.x;y=element.flipY?2*(element.y+element.height/2)-p.y:p.y;
 if(['pen','line','arrow'].includes(element.type)){
  const points=element.points?.length?element.points:[[element.x,element.y],[element.x+element.width,element.y+element.height]];
  if(points.length===1)return Math.hypot(x-points[0]![0]!,y-points[0]![1]!)<=padding;
  if(element.closed&&pointInPolygon(x,y,points))return true;
  for(let i=1;i<points.length;i++)if(distanceToSegment(x,y,points[i-1]![0]!,points[i-1]![1]!,points[i]![0]!,points[i]![1]!)<=padding)return true;
  return !!element.closed&&distanceToSegment(x,y,points[0]![0]!,points[0]![1]!,points.at(-1)![0]!,points.at(-1)![1]!)<=padding;
 }
 const path=shapePath(element);
 if(path){let cached=paths.get(element.id);if(cached?.path!==path){cached={path,sets:pointsOnPath(path,.4,1)};paths.set(element.id,cached);if(paths.size>50000)paths.delete(paths.keys().next().value!);}let inside=false;for(const set of cached.sets){for(let i=1;i<set.length;i++)if(distanceToSegment(x,y,set[i-1]![0]!,set[i-1]![1]!,set[i]![0]!,set[i]![1]!)<=padding)return true;const first=set[0],last=set.at(-1);if(first&&last&&Math.hypot(first[0]!-last[0]!,first[1]!-last[1]!)<.01&&pointInPolygon(x,y,set))inside=!inside;}return inside;}
 if(!contains(localBounds(element),x,y,padding))return false;
 const cx=element.x+element.width/2,cy=element.y+element.height/2,rx=Math.abs(element.width)/2,ry=Math.abs(element.height)/2;
 if(element.type==='ellipse'&&rx&&ry)return((x-cx)/(rx+padding))**2+((y-cy)/(ry+padding))**2<=1;
 if(element.type==='diamond'&&rx&&ry){const vertices=[[cx,element.y],[element.x+element.width,cy],[cx,element.y+element.height],[element.x,cy]];if(pointInPolygon(x,y,vertices))return true;return vertices.some((v,i)=>distanceToSegment(x,y,v[0]!,v[1]!,vertices[(i+1)%4]![0]!,vertices[(i+1)%4]![1]!)<=padding);}
 return true;
}

export function elementOutline(element:SceneElement):{points:[number,number][];closed:boolean}[]{
 const path=shapePath(element);let sets:{points:[number,number][];closed:boolean}[];
 if(path){let entry=paths.get(element.id);if(entry?.path!==path){entry={path,sets:pointsOnPath(path,.4,1)};paths.set(element.id,entry);}sets=entry.sets.map(set=>{const points=set as[number,number][],a=points[0],b=points.at(-1);return{points,closed:!!a&&!!b&&Math.hypot(a[0]-b[0],a[1]-b[1])<.01};});}
 else if(['pen','line','arrow'].includes(element.type))sets=[{points:element.points||[[element.x,element.y],[element.x+element.width,element.y+element.height]],closed:!!element.closed}];
 else if(element.type==='ellipse')sets=[{points:Array.from({length:48},(_,i)=>[element.x+element.width/2+Math.cos(i*Math.PI/24)*element.width/2,element.y+element.height/2+Math.sin(i*Math.PI/24)*element.height/2]as[number,number]),closed:true}];
 else if(element.type==='diamond')sets=[{points:[[element.x+element.width/2,element.y],[element.x+element.width,element.y+element.height/2],[element.x+element.width/2,element.y+element.height],[element.x,element.y+element.height/2]],closed:true}];
 else sets=[{points:[[element.x,element.y],[element.x+element.width,element.y],[element.x+element.width,element.y+element.height],[element.x,element.y+element.height]],closed:true}];
 const center={x:element.x+element.width/2,y:element.y+element.height/2};return sets.map(set=>({...set,points:set.points.map(([x,y])=>{const p=rotatePoint({x:element.flipX?2*center.x-x:x,y:element.flipY?2*center.y-y:y},center,element.rotation);return[p.x,p.y];})}));
}
export function segmentsIntersect(a:readonly number[],b:readonly number[],c:readonly number[],d:readonly number[]):boolean{
 const cross=(p:readonly number[],q:readonly number[],r:readonly number[])=>(q[0]!-p[0]!)*(r[1]!-p[1]!)-(q[1]!-p[1]!)*(r[0]!-p[0]!);const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 if(Math.max(a[0]!,b[0]!)<Math.min(c[0]!,d[0]!)||Math.max(c[0]!,d[0]!)<Math.min(a[0]!,b[0]!)||Math.max(a[1]!,b[1]!)<Math.min(c[1]!,d[1]!)||Math.max(c[1]!,d[1]!)<Math.min(a[1]!,b[1]!))return false;return abC*abD<=0&&cdA*cdB<=0;
}
