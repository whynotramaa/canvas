import RBush from 'rbush';
import type { SceneElement } from '../schema';
import { bounds, type Bounds } from './geometry';
import { shapeNames } from '../schema/shapes';
export function visualBounds(e: SceneElement): Bounds {
  const b=bounds(e),padding=Math.max(24,(e.strokeWidth||1.8)*2)+(shapeNames.includes(e.type as any)?Math.max(Math.abs(e.width),Math.abs(e.height))*.2:0);
  if(e.type==='icon'&&e.text){const size=e.fontSize||16,rows=e.text.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(Array.from(line).length*size/Math.max(1,Math.abs(e.width)-24))),0),label=rows*size*(e.lineHeight||1.4)+12;return{minX:b.minX-padding-label,minY:b.minY-padding-label,maxX:b.maxX+padding+label,maxY:b.maxY+padding+label};}
  return {minX:b.minX-padding,minY:b.minY-padding,maxX:b.maxX+padding,maxY:b.maxY+padding};
}
interface Item extends Bounds { element: SceneElement; order: number; signature: string; revision:number }
export class SpatialIndex {
  private previous:SceneElement[]|null=null;private revision=0;
  private tree=new RBush<Item>(); private items=new Map<string,Item>();
  update(elements: SceneElement[]): void {
    if(this.previous===elements)return;this.previous=elements;
    const revision=++this.revision,added:Item[]=[];let membershipChanged=elements.length!==this.items.size;
    elements.forEach((element,order)=>{const previous=this.items.get(element.id);if(previous){previous.revision=revision;if(previous.element===element){previous.order=order;return;}}else membershipChanged=true;const signature=JSON.stringify([element.type,element.x,element.y,element.width,element.height,element.rotation,element.points,element.hidden,element.text,element.fontSize,element.strokeWidth,element.flipX,element.flipY,element.lineHeight]);
      if(previous&&previous.signature===signature){previous.element=element;previous.order=order;return;}
      if(previous)this.tree.remove(previous);
      const item={...visualBounds(element),element,order,signature,revision};this.items.set(element.id,item);if(!element.hidden)added.push(item);
    });
    if(membershipChanged)for(const[id,item]of this.items)if(item.revision!==revision){this.tree.remove(item);this.items.delete(id);}
    if(added.length)this.tree.load(added);
  }
  search(box:Bounds):SceneElement[]{return this.tree.search(box).sort((a,b)=>a.order-b.order).map(item=>item.element);}
}
