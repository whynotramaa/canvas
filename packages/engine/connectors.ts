import type{SceneElement}from'../schema';
import{rotatePoint,type Point}from'./geometry';
import {type Arrowhead} from '../schema/arrowheads';
export {arrowheads,type Arrowhead} from '../schema/arrowheads';
export function connectorPoints(e:SceneElement):[number,number][]{return e.points?.length?e.points:[[e.x,e.y],[e.x+e.width,e.y+e.height]];}
export function arrowheadPaths(kind:Arrowhead,tip:Point,previous:Point,size=14):{d:string;filled:boolean}[]{
 if(kind==='none')return[];const angle=Math.atan2(tip.y-previous.y,tip.x-previous.x),c=Math.cos(angle),s=Math.sin(angle),point=(x:number,y:number)=>`${tip.x+x*c-y*s} ${tip.y+x*s+y*c}`,line=(coords:number[][],close=false)=>`M${coords.map(([x,y])=>point(x!,y!)).join('L')}${close?'Z':''}`;
 if(kind==='arrow')return[{d:line([[-size,-size*.45],[0,0],[-size,size*.45]]),filled:false}];
 if(kind.startsWith('triangle'))return[{d:line([[0,0],[-size,-size*.5],[-size,size*.5]],true),filled:kind==='triangle'}];
 if(kind.startsWith('diamond'))return[{d:line([[0,0],[-size*.6,-size*.4],[-size*1.2,0],[-size*.6,size*.4]],true),filled:kind==='diamond'}];
 if(kind==='bar')return[{d:line([[0,-size*.5],[0,size*.5]]),filled:false}];
 if(kind.startsWith('dot')||kind.startsWith('circle')){const radius=size*(kind.startsWith('dot')?.25:.4),center={x:tip.x-radius*c,y:tip.y-radius*s};return[{d:`M${center.x-radius} ${center.y}a${radius} ${radius} 0 1 0 ${radius*2} 0a${radius} ${radius} 0 1 0 ${-radius*2} 0`,filled:kind==='dot'||kind==='circle'}];}
 const result:{d:string;filled:boolean}[]=[];
 if(kind==='crow-many'||kind==='crow-one-many')result.push({d:line([[0,-size*.5],[-size,0],[0,size*.5]]),filled:false});
 if(kind==='crow-one'||kind==='crow-one-many')result.push({d:line([[-size,-size*.5],[-size,size*.5]])+line([[-size*1.4,-size*.5],[-size*1.4,size*.5]]),filled:false});
 return result;
}
export function connectorWorldPoints(e:SceneElement):[number,number][]{const center={x:e.x+e.width/2,y:e.y+e.height/2};return connectorPoints(e).map(([x,y])=>{const p=rotatePoint({x:e.flipX?2*center.x-x:x,y:e.flipY?2*center.y-y:y},center,e.rotation);return[p.x,p.y];});}
function nodePoint(node:SceneElement,anchor:[number,number]):Point{
 let x=node.x+node.width*anchor[0],y=node.y+node.height*anchor[1],center={x:node.x+node.width/2,y:node.y+node.height/2};if(node.flipX)x=2*center.x-x;if(node.flipY)y=2*center.y-y;return rotatePoint({x,y},center,node.rotation);
}
export function anchorAt(node:SceneElement,point:Point):[number,number]{const center={x:node.x+node.width/2,y:node.y+node.height/2};let p=rotatePoint(point,center,-node.rotation);if(node.flipX)p.x=2*center.x-p.x;if(node.flipY)p.y=2*center.y-p.y;return[node.width?(p.x-node.x)/node.width:.5,node.height?(p.y-node.y)/node.height:.5];}
export function refreshBindings(before:SceneElement[],after:SceneElement[]):SceneElement[]{
 const old=new Map(before.map(e=>[e.id,e])),next=new Map(after.map(e=>[e.id,e]));
 return after.map(e=>{if(e.type!=='line'&&e.type!=='arrow')return e;const points=connectorWorldPoints(e),previous=old.get(e.id)||e,previousPoints=connectorWorldPoints(previous);let changed=false;const anchors:{startAnchor?:[number,number];endAnchor?:[number,number]}={};
  for(const side of ['start','end']as const){const id=side==='start'?e.startBinding:e.endBinding;if(!id)continue;const node=next.get(id);if(!node)continue;const index=side==='start'?0:points.length-1,oldNode=old.get(id)||node,anchor=(side==='start'?e.startAnchor:e.endAnchor)||anchorAt(oldNode,{x:previousPoints[side==='start'?0:previousPoints.length-1]![0],y:previousPoints[side==='start'?0:previousPoints.length-1]![1]});const p=nodePoint(node,anchor);points[index]=[p.x,p.y];if(side==='start')anchors.startAnchor=anchor;else anchors.endAnchor=anchor;changed=true;}
  if(!changed)return e;const first=points[0]!,last=points.at(-1)!;if(!e.rotation&&!e.flipX&&!e.flipY&&e.x===first[0]&&e.y===first[1]&&e.width===last[0]-first[0]&&e.height===last[1]-first[1]&&JSON.stringify(e.startAnchor)===JSON.stringify(anchors.startAnchor)&&JSON.stringify(e.endAnchor)===JSON.stringify(anchors.endAnchor)&&(!e.points||e.points.every((p,i)=>p[0]===points[i]![0]&&p[1]===points[i]![1])))return e;return{...e,...anchors,rotation:0,flipX:false,flipY:false,x:first[0],y:first[1],width:last[0]-first[0],height:last[1]-first[1],points:e.points?points:undefined};
 });
}
export function connectedCopy(elements:SceneElement[],id:string,direction:'left'|'right'|'up'|'down'):SceneElement[]{
 const source=elements.find(e=>e.id===id);if(!source)return elements;const dx=direction==='left'?-(Math.abs(source.width)+100):direction==='right'?Math.abs(source.width)+100:0,dy=direction==='up'?-(Math.abs(source.height)+100):direction==='down'?Math.abs(source.height)+100:0;
 const copy={...source,id:crypto.randomUUID(),x:source.x+dx,y:source.y+dy,points:source.points?.map(([x,y])=>[x+dx,y+dy]as[number,number]),groupIds:[],frameId:source.frameId};
 const x=source.x+source.width/2,y=source.y+source.height/2,edge:SceneElement={id:crypto.randomUUID(),type:'arrow',x,y,width:dx,height:dy,rotation:0,groupIds:[],frameId:source.frameId,assetId:null,startBinding:source.id,endBinding:copy.id,startAnchor:[.5,.5],endAnchor:[.5,.5]};return[...elements,edge,copy];
}
