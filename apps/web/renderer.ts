import{mathImage,notifyMath}from'./math';
import{richTextLayout}from'../../packages/engine/rich-text';
import{frameContext}from'../../packages/engine/frames';
import{elementOutline}from'../../packages/engine/geometry';
import {normaliseIconPath} from '../../packages/icons/path';
import {displayStroke,displayFill,displayBrand} from '../../packages/schema/color';
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
    if (e.type === 'icon' && e.icon) { ctx.save(); ctx.translate(e.x,e.y); ctx.scale(e.width/e.icon.width,e.height/e.icon.height); for (const art of e.icon.paths) { if (!e.iconMode || e.iconMode === 'handdrawn') cached('icon',[art.d,color,e.icon.width,opts.seed],()=>rc.generator.path(normaliseIconPath(art.d),{stroke:color,strokeWidth:e.icon!.width/64,roughness:e.clean||clean?0:.55,bowing:.3,seed:opts.seed})); else { const p = new Path2D(art.d); const paint=e.iconMode==='original'?displayBrand(art.color,dark):color; if(art.stroke){ctx.strokeStyle=paint;ctx.lineWidth=e.icon.width/20;ctx.stroke(p);}else{ctx.fillStyle=paint;ctx.fill(p,art.evenodd?'evenodd':'nonzero');} } } ctx.restore(); }
    else if (path&&e.type!=='code') cached('path',[path,opts],()=>rc.generator.path(path,opts));
    else if (e.type==='code') { const w=Math.abs(e.width),h=Math.abs(e.height),x=Math.min(e.x,e.x+e.width),y=Math.min(e.y,e.y+e.height); ctx.fillStyle=e.fill?displayFill(e.fill,dark)!:dark?'#1e1e21':'#ffffff'; ctx.beginPath(); ctx.roundRect(x,y,w,h,12); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,h,12); ctx.clip(); ctx.fillStyle=dark?'#2a2a2e':'#f3f3f4'; ctx.fillRect(x,y,w,32); ctx.fillStyle=dark?'#00000066':'#0000001a'; ctx.fillRect(x,y+32,w,1); ctx.restore(); ctx.strokeStyle=dark?'#ffffff1a':'#00000024'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x+.5,y+.5,w-1,h-1,12); ctx.stroke(); ['#ff5f57','#febc2e','#28c840'].forEach((dot,i)=>{ctx.fillStyle=dot; ctx.beginPath(); ctx.arc(x+20+i*20,y+16,6,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#0000001f'; ctx.lineWidth=.75; ctx.stroke();}); }
    else if (['rectangle','frame','sticky','table','embed'].includes(e.type)) cached('rectangle',[e.x,e.y,e.width,e.height,opts],()=>rc.generator.rectangle(e.x,e.y,e.width,e.height,opts));
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
      if(e.type==='code'){ctx.save();ctx.font=textFont({...e,fontSize:size-1});ctx.fillStyle=dark?'#5c5c63':'#b0b0b6';ctx.textAlign='right';lines.forEach((line,i)=>ctx.fillText(String(i+1),Math.min(e.x,e.x+e.width)+34,line.y+1));ctx.restore();}
      for(const line of lines)for(const run of line.runs){ctx.font=run.font;ctx.fillStyle=color;if('letterSpacing'in ctx)ctx.letterSpacing=`${e.letterSpacing||0}px`;if(run.code){ctx.save();ctx.fillStyle=dark?'#ffffff16':'#0000000b';ctx.fillRect(run.x-2,line.y-1,run.width+4,size+4);ctx.restore();}
        if(e.type==='code'){let offset=run.x;const ink=e.color?color:dark?'#e8e8ea':'#1d1d1f',tokens=run.text.split(/(\/\/.*$|\b(?:const|let|var|function|return|if|else|class|import|export|from|async|await|new|SELECT|FROM|WHERE|def|for|while|true|false|null|undefined|fn|pub|type|interface)\b|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\())/g);for(const token of tokens){ctx.fillStyle=token.startsWith('//')?(dark?'#7f8c98':'#707f8c'):/^["'`]/.test(token)?(dark?'#fc6a5d':'#c41a16'):/^\d/.test(token)?(dark?'#d0bf69':'#1c00cf'):/^(const|let|var|function|return|if|else|class|import|export|from|async|await|new|SELECT|FROM|WHERE|def|for|while|true|false|null|undefined|fn|pub|type|interface)$/.test(token)?(dark?'#fc5fa3':'#9b2393'):/^[A-Za-z_$][\w$]*$/.test(token)?(dark?'#67b7a4':'#326d74'):ink;ctx.fillText(token,offset,line.y);offset+=ctx.measureText(token).width;}}
        else{ctx.fillStyle=run.href||e.textLink?'#6558d3':color;ctx.fillText(run.text,ctx.direction==='rtl'?run.x+run.width:run.x,line.y);}
        if(e.underline||e.strike||run.strike||run.href||e.textLink){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;for(const position of [e.underline||run.href||e.textLink?line.y+size+1:null,e.strike||run.strike?line.y+size*.5:null])if(position!==null){ctx.beginPath();ctx.moveTo(run.x,position);ctx.lineTo(run.x+run.width,position);ctx.stroke();}}
      }
    }
    ctx.restore();
  }ctx.restore();if(selected||selectedIds.length)drawSelection(ctx,elements,view,selectedIds.length?selectedIds:selected?[selected]:[]);
}
export function drawSelection(ctx:CanvasRenderingContext2D,elements:SceneElement[],view:View,selectedIds:string[]){
 const ids=new Set(selectedIds),z=view.zoom,accent='#0a84ff';ctx.save();ctx.translate(view.x,view.y);ctx.scale(z,z);ctx.strokeStyle=accent;ctx.lineWidth=1/z;
 if(ids.size>1){ctx.globalAlpha=.55;ctx.setLineDash([4/z,3/z]);for(const e of elements)if(ids.has(e.id)){ctx.save();const cx=e.x+e.width/2,cy=e.y+e.height/2;ctx.translate(cx,cy);ctx.rotate(e.rotation*Math.PI/180);ctx.translate(-cx,-cy);ctx.strokeRect(Math.min(e.x,e.x+e.width),Math.min(e.y,e.y+e.height),Math.abs(e.width),Math.abs(e.height));ctx.restore();}ctx.setLineDash([]);ctx.globalAlpha=1;}
 const handles=selectionHandles(elements,ids,z),corner=(name:string)=>handles.find(h=>h.handle===name);const nw=corner('nw'),se=corner('se'),rotate=corner('rotate');
 if(nw&&se){ctx.lineWidth=1.5/z;ctx.strokeRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);}
 if(rotate&&nw){ctx.lineWidth=1.25/z;ctx.beginPath();ctx.moveTo(rotate.x,nw.y);ctx.lineTo(rotate.x,rotate.y+5/z);ctx.stroke();}
 ctx.fillStyle='#ffffff';ctx.lineWidth=1.5/z;
 for(const h of handles){ctx.beginPath();if(h.handle==='rotate')ctx.arc(h.x,h.y,5/z,0,Math.PI*2);else if(h.handle.length===1){const horizontal=h.handle==='n'||h.handle==='s',w=(horizontal?14:5)/z,hh=(horizontal?5:14)/z;ctx.roundRect(h.x-w/2,h.y-hh/2,w,hh,2.5/z);}else ctx.roundRect(h.x-4.5/z,h.y-4.5/z,9/z,9/z,2/z);ctx.fill();ctx.stroke();}
 ctx.restore();
}
