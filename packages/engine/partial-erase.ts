import type{SceneElement}from'../schema';
import{elementOutline,type Point}from'./geometry';
type Interval=[number,number];
function cutInterval(a:Point,b:Point,from:Point,to:Point,radius:number):Interval[]{
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,cuts:Interval[]=[];
 const circle=(c:Point)=>{const ox=a.x-c.x,oy=a.y-c.y;if(!length){if(ox*ox+oy*oy<=radius*radius)cuts.push([0,1]);return;}const linear=2*(ox*dx+oy*dy),constant=ox*ox+oy*oy-radius*radius,discriminant=linear*linear-4*length*constant;if(discriminant<0)return;const root=Math.sqrt(discriminant);cuts.push([(-linear-root)/(2*length),(-linear+root)/(2*length)]);};
 circle(from);circle(to);const ex=to.x-from.x,ey=to.y-from.y,span=Math.hypot(ex,ey);
 if(span){const ux=ex/span,uy=ey/span,px=a.x-from.x,py=a.y-from.y;let lo=0,hi=1;const constrain=(value:number,delta:number,min:number,max:number)=>{if(Math.abs(delta)<1e-12){if(value<min||value>max){lo=1;hi=0;}return;}const p=(min-value)/delta,q=(max-value)/delta;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));};constrain(px*ux+py*uy,dx*ux+dy*uy,0,span);constrain(-px*uy+py*ux,-dx*uy+dy*ux,-radius,radius);if(lo<=hi)cuts.push([lo,hi]);}
 const sorted=cuts.map(([lo,hi])=>[Math.max(0,lo),Math.min(1,hi)]as Interval).filter(([lo,hi])=>lo<=hi).sort((a,b)=>a[0]-b[0]),merged:Interval[]=[];for(const interval of sorted){const previous=merged.at(-1);if(previous&&interval[0]<=previous[1])previous[1]=Math.max(previous[1],interval[1]);else merged.push(interval);}return merged;
}
export function partialErase(element:SceneElement,from:Point,to:Point,radius:number):SceneElement[]{
 if(element.type!=='pen'||element.locked||element.hidden||!element.points?.length)return[element];const points=elementOutline(element)[0]!.points,fragments:{points:[number,number][];pressures:number[]}[]=[];let current:{points:[number,number][];pressures:number[]}|null=null,changed=false;
 for(let i=1;i<points.length;i++){
  const a=points[i-1]!,b=points[i]!,cuts=cutInterval({x:a[0],y:a[1]},{x:b[0],y:b[1]},from,to,radius+(element.strokeWidth??3)/2),keep:Interval[]=[];let cursor=0;for(const[lo,hi]of cuts){if(lo>cursor)keep.push([cursor,lo]);cursor=Math.max(cursor,hi);}if(cursor<1)keep.push([cursor,1]);if(cuts.length)changed=true;
  for(const[lo,hi]of keep){const point=(t:number):[number,number]=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],pressure=(t:number)=>(element.pressures?.[i-1]??.5)+((element.pressures?.[i]??.5)-(element.pressures?.[i-1]??.5))*t,start=point(lo),end=point(hi),last=current?.points.at(-1);if(!current||!last||Math.hypot(last[0]-start[0],last[1]-start[1])>1e-6){current={points:[start],pressures:[pressure(lo)]};fragments.push(current);}current.points.push(end);current.pressures.push(pressure(hi));if(hi<1)current=null;}
  if(!keep.length)current=null;
 }
 if(points.length===1&&cutInterval({x:points[0]![0],y:points[0]![1]},{x:points[0]![0],y:points[0]![1]},from,to,radius).length)return[];if(!changed)return[element];
 return fragments.filter(f=>f.points.length>1).map((fragment,i)=>{const first=fragment.points[0]!,last=fragment.points.at(-1)!;return{...element,text:i===0?element.text:undefined,id:i===0?element.id:crypto.randomUUID(),x:first[0],y:first[1],width:last[0]-first[0],height:last[1]-first[1],rotation:0,flipX:undefined,flipY:undefined,points:fragment.points,pressures:element.pressures?fragment.pressures:undefined};});
}
