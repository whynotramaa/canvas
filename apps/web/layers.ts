import type{SceneElement}from'../../packages/schema';
import{SpatialIndex}from'../../packages/engine/spatial';
import{draw,drawSelection}from'./renderer';
interface View{x:number;y:number;zoom:number}
interface Layer{canvas:HTMLCanvasElement;source:SceneElement[];signature:string;index:SpatialIndex}
const layers=new WeakMap<HTMLCanvasElement,Layer>();
export function drawLayers(ctx:CanvasRenderingContext2D,elements:SceneElement[],base:SceneElement[],activeIds:Set<string>,view:View,selection:string[],dark:boolean,width:number,height:number,ratio:number,revision:number,clean=false){
 const owner=ctx.canvas as HTMLCanvasElement;let layer=layers.get(owner);if(!layer){layer={canvas:document.createElement('canvas'),source:[],signature:'',index:new SpatialIndex()};layers.set(owner,layer);}
 const signature=JSON.stringify([view,width,height,ratio,dark,[...activeIds].sort(),revision,clean]);
 if(layer.source!==base||layer.signature!==signature){layer.canvas.width=Math.ceil(width*ratio);layer.canvas.height=Math.ceil(height*ratio);const context=layer.canvas.getContext('2d')!;context.scale(ratio,ratio);layer.index.update(base);const visible=layer.index.search({minX:-view.x/view.zoom,minY:-view.y/view.zoom,maxX:(width-view.x)/view.zoom,maxY:(height-view.y)/view.zoom}).filter(e=>!activeIds.has(e.id));draw(context,visible,view,null,dark,[],clean,base);layer.source=base;layer.signature=signature;}
 ctx.drawImage(layer.canvas,0,0,width,height);
 if(activeIds.size)draw(ctx,elements.filter(e=>activeIds.has(e.id)),view,null,dark,[],clean,elements);
 if(selection.length)drawSelection(ctx,elements,view,selection);
}
