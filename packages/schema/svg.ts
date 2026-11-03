import{mathSvg}from'./math';
import{richTextLayout}from'../engine/rich-text';
import{embeddedFontCss,type EmbeddedFont}from'./fonts';
import{frameContext}from'../engine/frames';
import {normaliseIconPath} from '../icons/path';
import rough from 'roughjs';
import type{Options}from'roughjs/bin/core';
import {rasterDataUrl} from './raster';
import{displayStroke,displayFill,isSafePaint}from'./color';
import {shapePath,shapeFillPath}from'../engine/shapes';
import {visualBounds}from'../engine/spatial';
import {layoutText,fontStack}from'../engine/text';
import {connectorPoints,arrowheadPaths}from'../engine/connectors';
import {getStroke}from'perfect-freehand';
import type{SceneElement}from'./index';
import {parseDrawing}from'./validation';
export interface SvgOptions{fonts?:EmbeddedFont[];clean?:boolean;dark?:boolean;id?:string;scale?:number;transparent?:boolean;background?:string;assetBlobs?:Record<string,string>;selection?:string[];measureText?:(text:string,element:SceneElement)=>number}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
function imageSource(id:string,assets:Record<string,string>):string{if(!assets[id])throw new Error(`Image asset ${id} is unavailable`);return rasterDataUrl(assets[id]);}
export function exportSvg(all:SceneElement[],options:SvgOptions={}):string{
 parseDrawing({version:1,elements:all});if(options.background!==undefined&&!isSafePaint(options.background))throw new Error('Invalid export background');const byId=new Map(all.map(e=>[e.id,e]));const elements=options.selection?all.filter(e=>options.selection!.includes(e.id)):all,visible=elements.filter(e=>!e.hidden&&!frameContext(byId,e).hidden),scale=options.scale??1;
 if(!Number.isFinite(scale)||scale<=0||scale>30)throw new Error('Invalid SVG export scale');
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const e of visible){const b=visualBounds(e);left=Math.min(left,b.minX);top=Math.min(top,b.minY);right=Math.max(right,b.maxX);bottom=Math.max(bottom,b.maxY);}if(!visible.length){left=top=0;right=400;bottom=300;}
 const generator=rough.generator();const roughPaths=(d:string,options:Options)=>generator.toPaths(generator.path(d,options)).map(path=>`<path d="${path.d}" stroke="${escape(path.stroke)}" stroke-width="${path.strokeWidth}" fill="${escape(path.fill||'none')}"${options.strokeLineDash&&path.stroke!=='none'?` stroke-dasharray="${options.strokeLineDash.join(' ')}"`:''}/>`).join('');
 const clips=new Map<string,{id:string;frame:SceneElement}>();
 const body=visible.map((e,index)=>{
  const color=escape(displayStroke(e.color,options.dark)),fill=e.fillStyle==='none'?'none':e.gradient?`url(#gradient-${index})`:escape(displayFill(e.fill,options.dark)||'none'),style=`stroke="${color}" stroke-width="${e.strokeWidth??1.8}" fill="${fill}"`,x=Math.min(e.x,e.x+e.width),y=Math.min(e.y,e.y+e.height),w=Math.abs(e.width),h=Math.abs(e.height),cx=e.x+e.width/2,cy=e.y+e.height/2;
  let shape='';const path=shapePath(e);
  if(e.type==='image'){if(!e.assetId)throw new Error('Image asset reference is missing');shape=`<image x="${x}" y="${y}" width="${w}" height="${h}" href="${imageSource(e.assetId,options.assetBlobs||{})}"/>`;}
  else if(e.type==='math')shape=`<g transform="translate(${Math.min(e.x,e.x+e.width)} ${Math.min(e.y,e.y+e.height)})">${mathSvg(e.latex||'',color,e.width,e.height,e.fontSize||24)}</g>`;
  else if(e.type==='icon'&&e.icon)shape=`<g transform="translate(${e.x} ${e.y}) scale(${e.width/e.icon.width} ${e.height/e.icon.height})">${e.icon.paths.map(art=>!e.iconMode||e.iconMode==='handdrawn'?roughPaths(normaliseIconPath(art.d),{stroke:color,strokeWidth:e.icon!.width/64,roughness:e.clean||options.clean?0:.55,bowing:.3,seed:Math.max(1,[...e.id].reduce((a,c)=>a+c.charCodeAt(0),0))}):`<path d="${escape(art.d)}"${art.evenodd?' fill-rule="evenodd"':''} fill="${art.stroke?'none':escape(e.iconMode==='original'?art.color:e.color||'#292929')}" stroke="${art.stroke?escape(e.iconMode==='original'?art.color:e.color||'#292929'):'none'}" stroke-width="${e.icon!.width/20}"/>`).join('')}</g>`;
  else if(path)shape=`<path d="${path}" ${style}/>`;
  else if(e.type==='ellipse')shape=`<ellipse cx="${cx}" cy="${cy}" rx="${w/2}" ry="${h/2}" ${style}/>`;
  else if(e.type==='diamond')shape=`<polygon points="${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}" ${style}/>`;
  else if(e.type==='line'||e.type==='arrow'){const points=connectorPoints(e);shape=roughPaths(`M${points.map(p=>p.join(' ')).join('L')}${e.closed?'Z':''}`,{stroke:color,strokeWidth:e.strokeWidth??1.8,fill:e.closed&&fill!=='none'?fill:undefined,fillStyle:e.gradient?'solid':e.fillStyle||'solid',roughness:e.clean||options.clean?0:e.roughness??1,strokeLineDash:e.strokeStyle==='dashed'?[8,6]:e.strokeStyle==='dotted'?[2,4]:undefined,seed:Math.max(1,[...e.id].reduce((a,c)=>a+c.charCodeAt(0),0))});if(e.type==='arrow'&&points.length>1)for(const side of ['start','end']as const){const tip=points[side==='start'?0:points.length-1]!,previous=points[side==='start'?1:points.length-2]!;for(const head of arrowheadPaths(side==='start'?e.startArrowhead||'none':e.endArrowhead||'arrow',{x:tip[0],y:tip[1]},{x:previous[0],y:previous[1]}))shape+=`<path d="${head.d}" stroke="${color}" stroke-width="${e.strokeWidth??1.8}" fill="${head.filled?color:'none'}"/>`;}}
  else if(e.type==='pen'){const points=getStroke((e.points||[]).map(([x,y],i)=>e.pressures?[x,y,e.pressures[i]??.5]:[x,y]),{size:e.strokeWidth??3,thinning:.5,smoothing:e.smoothing??.5,streamline:e.smoothing??.5,simulatePressure:!e.pressures});shape=points.length?`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${color}"/>`:'';}
  else if(e.type!=='text')shape=`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${style}/>`;
  const d=shapeFillPath(e);if(d)shape=roughPaths(d,{stroke:color,strokeWidth:e.strokeWidth??1.8,fill:fill==='none'?undefined:fill,fillStyle:e.gradient?'solid':e.fillStyle||'solid',roughness:e.clean||options.clean?0:e.roughness??1,strokeLineDash:e.strokeStyle==='dashed'?[8,6]:e.strokeStyle==='dotted'?[2,4]:undefined,seed:Math.max(1,[...e.id].reduce((a,c)=>a+c.charCodeAt(0),0))});
  let definitions='';if(e.gradient)definitions+=`<linearGradient id="gradient-${index}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${escape(displayFill(e.gradient.start,options.dark)!)}"/><stop offset="1" stop-color="${escape(displayFill(e.gradient.end,options.dark)!)}"/></linearGradient>`;if(e.shadow)definitions+=`<filter id="shadow-${index}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="3" dy="4" stdDeviation="6" flood-opacity=".27"/></filter>`;
  let text='';
  const fontSize=e.fontSize||(e.type==='code'||e.type==='table'?14:e.type==='text'?20:16),family=escape(fontStack(e)),textStyle=`font-family="${family}" font-size="${fontSize}" font-weight="${e.bold?'700':'400'}" font-style="${e.italic?'italic':'normal'}" text-decoration="${[e.underline?'underline':'',e.strike?'line-through':''].filter(Boolean).join(' ')||'none'}" fill="${color}"`;
  if(e.type==='table'){const cells=e.cells||[['',''],['','']],cw=w/cells[0]!.length,ch=h/cells.length;for(let r=0;r<cells.length;r++)for(let c=0;c<cells[r]!.length;c++){shape+=`<rect x="${x+c*cw}" y="${y+r*ch}" width="${cw}" height="${ch}" ${style}/>`;text+=`<text x="${x+c*cw+8}" y="${y+r*ch+ch/2}" dominant-baseline="middle" ${textStyle}>${escape(cells[r]![c]!)}</text>`;}}
  else if(e.text||e.type==='embed'){const lines=richTextLayout(e,(text,style)=>options.measureText?options.measureText(text,style):Array.from(text).length*(style.fontSize||fontSize)*.58);for(const line of lines)for(const run of line.runs){const spanStyle=`font-family="${escape(fontStack(run.element))}" font-size="${fontSize}" font-weight="${run.element.bold?'700':'400'}" font-style="${run.element.italic?'italic':'normal'}" letter-spacing="${e.letterSpacing||0}" text-decoration="${[e.underline||run.href||e.textLink?'underline':'',e.strike||run.strike?'line-through':''].filter(Boolean).join(' ')||'none'}" fill="${run.href||e.textLink?'#6558d3':color}"`;const label=`<text x="${run.x}" y="${line.y}" dominant-baseline="hanging" direction="${/[\u0590-\u08ff]/.test(run.text)?'rtl':'ltr'}" ${spanStyle}>${escape(run.text)}</text>`;text+=run.href||e.textLink?`<a href="${escape(run.href||e.textLink!)}">${label}</a>`:label;}}
  const unflip=e.flipX||e.flipY?`<g transform="translate(${cx} ${cy}) scale(${e.flipX?-1:1} ${e.flipY?-1:1}) translate(${-cx} ${-cy})">${text}</g>`:text;
  const context=frameContext(byId,e),clipIds=context.clips.map(frame=>{let entry=clips.get(frame.id);if(!entry){entry={id:`frame-clip-${clips.size}`,frame};clips.set(frame.id,entry);}return entry.id;});
  return`${clipIds.map(id=>`<g clip-path="url(#${id})">`).join('')}${definitions?`<defs>${definitions}</defs>`:''}<g${e.shadow?` filter="url(#shadow-${index})"`:''} stroke-linejoin="${e.edgeStyle==='round'?'round':'miter'}" stroke-linecap="${e.edgeStyle==='round'?'round':'butt'}" opacity="${e.opacity??1}" transform="translate(${cx} ${cy}) rotate(${e.rotation}) scale(${e.flipX?-1:1} ${e.flipY?-1:1}) translate(${-cx} ${-cy})">${shape}${unflip}</g>${clipIds.map(()=>'</g>').join('')}`;
 }).join('');
 const clipDefs=[...clips.values()].map(({id,frame})=>`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${shapeFillPath(frame)}" transform="rotate(${frame.rotation} ${frame.x+frame.width/2} ${frame.y+frame.height/2})"/></clipPath>`).join('');
 const background=options.transparent===false?`<rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" fill="${escape(options.background||'#ffffff')}"/>`:'';
 const assets=options.assetBlobs?Object.fromEntries([...new Set(elements.flatMap(e=>e.assetId?[e.assetId]:[]))].map(id=>[id,options.assetBlobs![id]])):undefined;
 return`<svg xmlns="http://www.w3.org/2000/svg" width="${(right-left)*scale}" height="${(bottom-top)*scale}" viewBox="${left} ${top} ${right-left} ${bottom-top}"><metadata id="canvas-scene">${escape(JSON.stringify({version:1,id:options.id,elements,assetBlobs:assets,fontBlobs:options.fonts}))}</metadata>${options.fonts?.length?`<style>${embeddedFontCss(options.fonts)}</style>`:''}${clipDefs?`<defs>${clipDefs}</defs>`:''}${background}${body}</svg>`;
}
