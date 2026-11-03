import{isSafePaint}from'./color';
import{arrowheads}from'./arrowheads';
import { validateArtwork } from '../icons/types';
import { shapeNames } from './shapes';
import type { SceneElement } from './index';

const types = new Set([...shapeNames, 'sticky','table','code','embed','icon','math', 'rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'pen', 'text', 'image', 'frame']);
export function parseDrawing(value: unknown): SceneElement[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid drawing file');
  const doc = value as Record<string, unknown>;
  if (doc.version !== 1 || !Array.isArray(doc.elements)) throw new Error('Unsupported drawing version');
  const ids = new Set<string>();
  for (const item of doc.elements) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid element');
    const e = item as Record<string, unknown>;
    if (typeof e.id !== 'string' || !e.id || ids.has(e.id) || typeof e.type !== 'string' || !types.has(e.type)) throw new Error('Invalid element identity');
    ids.add(e.id);
    for (const key of ['x', 'y', 'width', 'height', 'rotation']) if (typeof e[key] !== 'number' || !Number.isFinite(e[key])) throw new Error('Invalid element geometry');
    if (!Array.isArray(e.groupIds) || !e.groupIds.every(id => typeof id === 'string')) throw new Error('Invalid element groups');
    for (const key of ['frameId', 'assetId', 'startBinding', 'endBinding']) if (e[key] !== null && typeof e[key] !== 'string') throw new Error('Invalid element reference');
    for(const key of ['fontFamily','language','url'])if(e[key]!==undefined&&(typeof e[key]!=='string'||/[<>\x00-\x1f]/.test(e[key] as string)))throw new Error('Invalid rich text string');
    for(const key of ['bold','italic','underline','strike'])if(e[key]!==undefined&&typeof e[key]!=='boolean')throw new Error('Invalid text format');
    if(e.fontSize!==undefined&&(typeof e.fontSize!=='number'||!Number.isFinite(e.fontSize)||e.fontSize<6||e.fontSize>200))throw new Error('Invalid font size');
    if(e.lineHeight!==undefined&&(typeof e.lineHeight!=='number'||!Number.isFinite(e.lineHeight)||e.lineHeight<.5||e.lineHeight>5))throw new Error('Invalid line height');
    if(e.letterSpacing!==undefined&&(typeof e.letterSpacing!=='number'||!Number.isFinite(e.letterSpacing)||e.letterSpacing< -10||e.letterSpacing>100))throw new Error('Invalid letter spacing');
    if(e.verticalAlign!==undefined&&!['top','middle','bottom'].includes(e.verticalAlign as string))throw new Error('Invalid vertical alignment');
    if(e.listStyle!==undefined&&!['none','bullet','number'].includes(e.listStyle as string))throw new Error('Invalid list style');
    if(e.textLink!==undefined){if(typeof e.textLink!=='string')throw new Error('Invalid text link');const url=new URL(e.textLink);if(!['https:','http:','mailto:'].includes(url.protocol)||url.username||url.password)throw new Error('Unsafe text link');}
    if(e.textAlign!==undefined&&!['left','center','right'].includes(e.textAlign as string))throw new Error('Invalid text alignment');
    if(e.cells!==undefined){const cells=e.cells as unknown[][];if(!Array.isArray(cells)||!cells.length||cells.length>100||!cells.every(row=>Array.isArray(row)&&row.length>0&&row.length<=30&&row.length===cells[0]!.length&&row.every(cell=>typeof cell==='string'&&cell.length<=20000)))throw new Error('Invalid table cells');}
    if(e.component!==undefined){const c=e.component as Record<string,unknown>;if(!c||typeof c!=='object'||!['definitionId','instanceId','sourceId'].every(key=>typeof c[key]==='string'&&!!c[key]))throw new Error('Invalid component instance');if(c.overrides!==undefined&&(!c.overrides||typeof c.overrides!=='object'||Object.entries(c.overrides).some(([key,value])=>!['text','color','fill'].includes(key)||typeof value!=='boolean')))throw new Error('Invalid component overrides');}
    if(e.link!==undefined){const link=e.link as Record<string,unknown>;if(!link||typeof link!=='object'||typeof link.drawingId!=='string'||!link.drawingId||(link.elementId!==undefined&&typeof link.elementId!=='string'))throw new Error('Invalid drawing link');}
    if (e.type === 'icon') { validateArtwork(e.icon); if (e.iconMode !== undefined && !['handdrawn','monochrome','original'].includes(e.iconMode as string)) throw new Error('Invalid icon style'); }
    for(const key of ['flipX','flipY'])if(e[key]!==undefined&&typeof e[key]!=='boolean')throw new Error('Invalid flip');
    for(const key of ['startArrowhead','endArrowhead'])if(e[key]!==undefined&&!arrowheads.includes(e[key] as any))throw new Error('Invalid arrowhead');
    for(const key of ['startAnchor','endAnchor'])if(e[key]!==undefined&&(!Array.isArray(e[key])||(e[key] as unknown[]).length!==2||!(e[key] as unknown[]).every(n=>typeof n==='number'&&Number.isFinite(n))))throw new Error('Invalid binding anchor');
    if(e.arrowStyle!==undefined&&!['straight','curved','elbow'].includes(e.arrowStyle as string))throw new Error('Invalid arrow style');
    if(e.pinned!==undefined&&typeof e.pinned!=='boolean')throw new Error('Invalid pin');
    if(e.latex!==undefined&&(typeof e.latex!=='string'||e.latex.length>20000))throw new Error('Invalid math');
    if(e.closed!==undefined&&typeof e.closed!=='boolean')throw new Error('Invalid closed path');
    if(e.smoothing!==undefined&&(typeof e.smoothing!=='number'||!Number.isFinite(e.smoothing)||e.smoothing<0||e.smoothing>1))throw new Error('Invalid stroke smoothing');
    if(e.pressures!==undefined&&(!Array.isArray(e.pressures)||!e.pressures.every(p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=1)||!Array.isArray(e.points)||e.pressures.length!==e.points.length))throw new Error('Invalid pen pressures');
    if (e.notes !== undefined && typeof e.notes !== 'string') throw new Error('Invalid notes');
    if (e.text !== undefined && typeof e.text !== 'string') throw new Error('Invalid text');
    for (const key of ['locked', 'hidden']) if (e[key] !== undefined && typeof e[key] !== 'boolean') throw new Error('Invalid visibility or lock');
    if(e.fillStyle!==undefined&&!['none','hachure','cross-hatch','solid','zigzag','dots'].includes(e.fillStyle as string))throw new Error('Invalid fill style');
    if(e.strokeStyle!==undefined&&!['solid','dashed','dotted'].includes(e.strokeStyle as string))throw new Error('Invalid stroke style');
    if(e.edgeStyle!==undefined&&!['sharp','round'].includes(e.edgeStyle as string))throw new Error('Invalid edge style');
    for(const key of ['clean','shadow','container','autoSize','badge','clip'])if(e[key]!==undefined&&typeof e[key]!=='boolean')throw new Error('Invalid render style');
    if(e.roughness!==undefined&&(typeof e.roughness!=='number'||!Number.isFinite(e.roughness)||e.roughness<0||e.roughness>3))throw new Error('Invalid roughness');
    if(e.cornerRadius!==undefined&&(typeof e.cornerRadius!=='number'||!Number.isFinite(e.cornerRadius)||e.cornerRadius<0||e.cornerRadius>200))throw new Error('Invalid corner radius');
    if(e.gradient!==undefined){const gradient=e.gradient as {start:unknown;end:unknown};if(!gradient||!isSafePaint(gradient.start)||!isSafePaint(gradient.end)||!/^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(gradient.start)||!/^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(gradient.end))throw new Error('Invalid gradient');}
    if (e.fill !== undefined && !isSafePaint(e.fill)) throw new Error('Invalid fill');
    if (e.strokeWidth !== undefined && (typeof e.strokeWidth !== 'number' || !Number.isFinite(e.strokeWidth) || e.strokeWidth < 0 || e.strokeWidth > 100)) throw new Error('Invalid stroke width');
    if (e.opacity !== undefined && (typeof e.opacity !== 'number' || !Number.isFinite(e.opacity) || e.opacity < 0 || e.opacity > 1)) throw new Error('Invalid opacity');
    if (e.color !== undefined && !isSafePaint(e.color)) throw new Error('Invalid color');
    if (e.points !== undefined && (!Array.isArray(e.points) || !e.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n))))) throw new Error('Invalid points');
  }
  return doc.elements as SceneElement[];
}
