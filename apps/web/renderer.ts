import{mathImage,notifyMath}from'./math';
import{richTextLayout}from'../../packages/engine/rich-text';
import{frameContext}from'../../packages/engine/frames';
import{elementOutline}from'../../packages/engine/geometry';
import {normaliseIconPath} from '../../packages/icons/path';
import {displayStroke,displayFill} from '../../packages/schema/color';
import{connectorPoints,arrowheadPaths}from'../../packages/engine/connectors';
import{selectionHandles}from'../../packages/engine/handles';
import {layoutText,textFont}from'../../packages/engine/text';
import { GeometryCache } from '../../packages/engine/render-cache';
import type { Drawable } from 'roughjs/bin/core';
const geometryCache=new GeometryCache();
import rough from 'roughjs';
import { getStroke } from 'perfect-freehand';
import type { SceneElement } from '../../packages/schema';
import { shapePath,shapeFillPath } from '../../packages/engine/shapes';
import { cachedImage } from './assets';
type Shape = SceneElement;
type View = { x: number; y: number; zoom: number };
export function draw(ctx: CanvasRenderingContext2D, elements: Shape[], view: View, selected: string | null, dark: boolean, selectedIds: string[] = [],clean=false,scene:SceneElement[]=elements) {
  ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.zoom, view.zoom); const rc = rough.canvas(ctx.canvas);
  let byId:Map<string,SceneElement>|undefined;
  for (const e of elements) {
    if (e.hidden) continue;
    ctx.save();if(e.frameId){byId||=new Map(scene.map(item=>[item.id,item]));const context=frameContext(byId,e);if(context.hidden){ctx.restore();continue;}for(const frame of context.clips){ctx.beginPath();for(const outline of elementOutline(frame)){outline.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.clip();}}ctx.globalAlpha = e.opacity ?? 1; const cx = e.x + e.width / 2, cy = e.y + e.height / 2; ctx.translate(cx, cy); ctx.rotate(e.rotation * Math.PI / 180); ctx.scale(e.flipX?-1:1,e.flipY?-1:1);ctx.translate(-cx, -cy);
    const color = displayStroke(e.color,dark); const opts = { stroke: color, strokeWidth: e.strokeWidth ?? 1.8, fill: e.fillStyle==='none'||e.gradient?undefined:displayFill(e.fill,dark), fillStyle: e.fillStyle||'solid', roughness:e.clean||clean?0:e.roughness??1,strokeLineDash:e.strokeStyle==='dashed'?[8,6]:e.strokeStyle==='dotted'?[2,4]:undefined, seed: Math.max(1, [...e.id].reduce((a, c) => a + c.charCodeAt(0), 0)) };
    ctx.lineJoin=e.edgeStyle==='round'?'round':'miter';ctx.lineCap=e.edgeStyle==='round'?'round':'butt';if(e.shadow){ctx.shadowColor='#00000044';ctx.shadowBlur=12;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;}if(e.gradient&&e.fillStyle!=='none'){const d=shapeFillPath(e);if(d){const gradient=ctx.createLinearGradient(e.x,e.y,e.x+e.width,e.y+e.height);gradient.addColorStop(0,displayFill(e.gradient.start,dark)!);gradient.addColorStop(1,displayFill(e.gradient.end,dark)!);ctx.fillStyle=gradient;ctx.fill(new Path2D(d));}}
    let part=0;const cached=(kind:string,args:unknown[],build:()=>Drawable)=>rc.draw(geometryCache.get(`${e.id}:${part++}`,JSON.stringify([kind,args]),build));
    const path = shapePath(e);
    if (e.type === 'icon' && e.icon) { ctx.save(); ctx.translate(e.x,e.y); ctx.scale(e.width/e.icon.width,e.height/e.icon.height); for (const art of e.icon.paths) { if (!e.iconMode || e.iconMode === 'handdrawn') cached('icon',[art.d,color,e.icon.width,opts.seed],()=>rc.generator.path(normaliseIconPath(art.d),{stroke:color,strokeWidth:e.icon!.width/64,roughness:e.clean||clean?0:.55,bowing:.3,seed:opts.seed})); else { const p = new Path2D(art.d); const paint=e.iconMode==='original'?art.color:color; if(art.stroke){ctx.strokeStyle=paint;ctx.lineWidth=e.icon.width/20;ctx.stroke(p);}else{ctx.fillStyle=paint;ctx.fill(p);} } } ctx.restore(); }
    else if (path) cached('path',[path,opts],()=>rc.generator.path(path,opts));
    else if (['rectangle','frame','sticky','table','code','embed'].includes(e.type)) cached('rectangle',[e.x,e.y,e.width,e.height,opts],()=>rc.generator.rectangle(e.x,e.y,e.width,e.height,opts));
    else if (e.type === 'ellipse') cached('ellipse',[e.x,e.y,e.width,e.height,opts],()=>rc.generator.ellipse(e.x+e.width/2,e.y+e.height/2,Math.abs(e.width),Math.abs(e.height),opts));
    else if (e.type === 'diamond') cached('diamond',[e.x,e.y,e.width,e.height,opts],()=>rc.generator.polygon([[e.x+e.width/2,e.y],[e.x+e.width,e.y+e.height/2],[e.x+e.width/2,e.y+e.height],[e.x,e.y+e.height/2]],opts));
    else if(e.type==='line'||e.type==='arrow'){
      const points=connectorPoints(e);if(points.length>1)cached('connector',[points,e.closed,opts],()=>e.closed?rc.generator.polygon(points,opts):rc.generator.linearPath(points,opts));
      if(e.type==='arrow'&&points.length>1){for(const side of ['start','end']as const){const tip=points[side==='start'?0:points.length-1]!,previous=points[side==='start'?1:points.length-2]!,kind=side==='start'?e.startArrowhead||'none':e.endArrowhead||'arrow';for(const head of arrowheadPaths(kind,{x:tip[0],y:tip[1]},{x:previous[0],y:previous[1]}))cached('arrowhead',[head,opts],()=>rc.generator.path(head.d,{...opts,fill:head.filled?color:undefined,fillStyle:'solid'}));}}
    }
    else if (e.type === 'pen' && e.points && e.points.length > 1) { const stroke = getStroke(e.points.map(([x,y],i)=>e.pressures?[x,y,e.pressures[i]??.5]:[x,y]), { size:e.strokeWidth??3, thinning:0.5, smoothing:e.smoothing??0.5, streamline:e.smoothing??0.5,simulatePressure:!e.pressures }); if (stroke.length) { ctx.beginPath(); ctx.fillStyle = color; ctx.moveTo(stroke[0]![0]!, stroke[0]![1]!); for (const p of stroke.slice(1)) ctx.lineTo(p[0]!, p[1]!); ctx.closePath(); ctx.fill(); } }
    else if (e.type === 'math') { const image = mathImage(e.latex || '', color, e.width, e.height, e.fontSize || 24, notifyMath); if (image) ctx.drawImage(image, Math.min(e.x, e.x + e.width), Math.min(e.y, e.y + e.height), Math.abs(e.width), Math.abs(e.height)); else { ctx.fillStyle = color; ctx.font = '14px monospace'; ctx.fillText(e.latex || '', e.x + 6, e.y + 20); } }
    else if (e.type === 'image' && e.assetId) { const bitmap = cachedImage(e.assetId); if (bitmap) ctx.drawImage(bitmap, e.x, e.y, e.width, e.height); else { ctx.strokeStyle = color; ctx.strokeRect(e.x, e.y, e.width, e.height); ctx.fillStyle = color; ctx.font = '14px sans-serif'; ctx.fillText('Image unavailable', e.x + 8, e.y + 20); } }
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;
    if(e.flipX||e.flipY){ctx.translate(cx,cy);ctx.scale(e.flipX?-1:1,e.flipY?-1:1);ctx.translate(-cx,-cy);}
    if(e.type==='table'){
      const cells=e.cells||[['',''],['','']],rows=cells.length,cols=cells[0]!.length,cw=Math.abs(e.width)/cols,ch=Math.abs(e.height)/rows;ctx.font=textFont({...e,fontSize:e.fontSize||14});ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=e.strokeWidth||1;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=e.x+col*cw,y=e.y+row*ch;ctx.strokeRect(x,y,cw,ch);ctx.save();ctx.beginPath();ctx.rect(x+4,y+2,cw-8,ch-4);ctx.clip();ctx.textBaseline='middle';ctx.fillText(cells[row]![col]!,x+8,y+ch/2);ctx.restore();}
    }else if(e.text||e.type==='embed'){
      const size=e.fontSize||(e.type==='code'?14:e.type==='text'?20:16);ctx.textBaseline='top';ctx.direction=/[\u0590-\u08ff]/.test(e.text||'')?'rtl':'ltr';const lines=richTextLayout(e,(text,style)=>{ctx.font=textFont(style);if('letterSpacing'in ctx)ctx.letterSpacing='0px';return ctx.measureText(text).width;});
      for(const line of lines)for(const run of line.runs){ctx.font=run.font;ctx.fillStyle=color;if('letterSpacing'in ctx)ctx.letterSpacing=`${e.letterSpacing||0}px`;if(run.code){ctx.save();ctx.fillStyle=dark?'#ffffff16':'#0000000b';ctx.fillRect(run.x-2,line.y-1,run.width+4,size+4);ctx.restore();}
        if(e.type==='code'){let offset=run.x;const tokens=run.text.split(/(\b(?:const|let|function|return|if|else|class|import|from|SELECT|FROM|WHERE|def|for|while|true|false|null)\b|"[^"\n]*"|'[^'\n]*'|\b\d+\b)/g);for(const token of tokens){ctx.fillStyle=/^["']/.test(token)?'#508246':/^\d+$/.test(token)?'#bf6d36':/^(const|let|function|return|if|else|class|import|from|SELECT|FROM|WHERE|def|for|while|true|false|null)$/.test(token)?'#8a69b0':color;ctx.fillText(token,offset,line.y);offset+=ctx.measureText(token).width;}}
        else{ctx.fillStyle=run.href||e.textLink?'#6558d3':color;ctx.fillText(run.text,ctx.direction==='rtl'?run.x+run.width:run.x,line.y);}
        if(e.underline||e.strike||run.strike||run.href||e.textLink){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;for(const position of [e.underline||run.href||e.textLink?line.y+size+1:null,e.strike||run.strike?line.y+size*.5:null])if(position!==null){ctx.beginPath();ctx.moveTo(run.x,position);ctx.lineTo(run.x+run.width,position);ctx.stroke();}}
      }
    }
    ctx.restore();
  }ctx.restore();if(selected||selectedIds.length)drawSelection(ctx,elements,view,selectedIds.length?selectedIds:selected?[selected]:[]);
}
export function drawSelection(ctx:CanvasRenderingContext2D,elements:SceneElement[],view:View,selectedIds:string[]){
 const ids=new Set(selectedIds);ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.zoom,view.zoom);ctx.strokeStyle='#6558d3';ctx.lineWidth=1/view.zoom;ctx.setLineDash([5/view.zoom,4/view.zoom]);
 for(const e of elements)if(ids.has(e.id)){ctx.save();const cx=e.x+e.width/2,cy=e.y+e.height/2;ctx.translate(cx,cy);ctx.rotate(e.rotation*Math.PI/180);ctx.translate(-cx,-cy);ctx.strokeRect(Math.min(e.x,e.x+e.width)-5,Math.min(e.y,e.y+e.height)-5,Math.abs(e.width)+10,Math.abs(e.height)+10);ctx.restore();}
 ctx.setLineDash([]);ctx.fillStyle='#ffffff';for(const handle of selectionHandles(elements,ids,view.zoom)){const size=7/view.zoom;ctx.beginPath();if(handle.handle==='rotate')ctx.arc(handle.x,handle.y,size/2,0,Math.PI*2);else ctx.rect(handle.x-size/2,handle.y-size/2,size,size);ctx.fill();ctx.stroke();}ctx.restore();
}
