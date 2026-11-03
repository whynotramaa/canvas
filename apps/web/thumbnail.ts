import type{SceneElement}from'../../packages/schema';
import type{CanvasSettings}from'../../packages/engine/navigation';
import{displayFill,displayStroke}from'../../packages/schema/color';
import{exportBounds}from'./ExportPanel';
import{draw}from'./renderer';
import{drawBackdrop}from'./backdrop';
export function drawingThumbnail(elements:SceneElement[],dark:boolean,settings:CanvasSettings):string{
 const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Thumbnail canvas unavailable');const visible=elements.filter(e=>!e.hidden),bounds=exportBounds(visible),zoom=Math.min(224/bounds.width,144/bounds.height),view={zoom,x:120-(bounds.x+bounds.width/2)*zoom,y:80-(bounds.y+bounds.height/2)*zoom};drawBackdrop(ctx,240,160,view,dark,settings);
 // shortcut: dense thumbnails use coarse geometry below the top 512 elements; use worker rendering if larger detailed previews are needed.
 const detailed:SceneElement[]=[];for(let i=0;i<visible.length;i++){const e=visible[i]!;if(i>=visible.length-512&&Math.max(Math.abs(e.width),Math.abs(e.height))*zoom>=2)detailed.push(e);else{ctx.fillStyle=displayFill(e.fill,dark)||displayStroke(e.color,dark);ctx.globalAlpha=e.opacity??1;ctx.fillRect(e.x*zoom+view.x,e.y*zoom+view.y,Math.max(1,Math.abs(e.width)*zoom),Math.max(1,Math.abs(e.height)*zoom));}}ctx.globalAlpha=1;draw(ctx,detailed,view,null,dark,[],settings.clean);return canvas.toDataURL('image/webp',.65);
}
