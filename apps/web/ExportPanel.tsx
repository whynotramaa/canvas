import{embeddedSceneFonts}from'./font-subsets';
import {visualBounds} from '../../packages/engine/spatial';
import{exportSvg}from'../../packages/schema/svg';
import{textFont}from'../../packages/engine/text';
import { useState } from 'react';
import type { SceneElement } from '../../packages/schema';
import { embedPngScene } from '../../packages/schema/png';
import { createWorkspace, emptyDrawing } from '../../packages/workspace';
import { portableWorkspace, loadImage } from './assets';
import { draw } from './renderer';
export function exportBounds(elements: SceneElement[]) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const e of elements) {const b=visualBounds(e);left=Math.min(left,b.minX);top=Math.min(top,b.minY);right=Math.max(right,b.maxX);bottom=Math.max(bottom,b.maxY);}
  if (!elements.length) return { x: 0, y: 0, width: 400, height: 300 };
  return { x: left, y: top, width: right-left, height: bottom-top };
}
export function ExportPanel({ elements, selected, selectedIds = [], dark, clean=false, close }: { elements: SceneElement[]; selected: string | null; selectedIds?: string[]; dark: boolean; clean?:boolean; close: () => void }) {
  const [scale,setScale] = useState(1), [transparent,setTransparent] = useState(false), [selection,setSelection] = useState(false), [format,setFormat] = useState('png'), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const exportImage = async () => {
    setBusy(true); setError('');
    try {
      const items = elements.filter(e => !e.hidden && (!selection || (selectedIds.length ? selectedIds.includes(e.id) : e.id === selected))); const bounds = exportBounds(items);
      if(format==='svg'){await document.fonts.ready;const portable=await portableWorkspace(createWorkspace({...emptyDrawing(),elements:items})),context=document.createElement('canvas').getContext('2d')!;const fonts=await embeddedSceneFonts(items);const svg=exportSvg(elements,{fonts,selection:items.map(e=>e.id),dark,clean,scale,transparent,background:dark?'#19191d':'#ffffff',assetBlobs:portable.assetBlobs,measureText:(text,e)=>{context.font=textFont(e);return context.measureText(text).width;}});const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),link=document.createElement('a');link.href=url;link.download='drawing.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
      if (bounds.width * scale > 16000 || bounds.height * scale > 16000 || bounds.width * bounds.height * scale ** 2 > 64000000) throw new Error('Export exceeds 64 megapixels or 16,000 pixels per side. Select a smaller region or reduce scale.');
      await Promise.all(items.flatMap(e => e.assetId ? [loadImage(e.assetId)] : []));
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(bounds.width * scale); canvas.height = Math.ceil(bounds.height * scale); const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      if (!transparent) { ctx.fillStyle = dark ? '#19191d' : '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
      draw(ctx,items,{ x: -bounds.x * scale, y: -bounds.y * scale, zoom: scale },null,dark,[],clean,elements);
      let blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), `image/${format}`, .95));
      if (format === 'png') { const workspace = await portableWorkspace(createWorkspace({ ...emptyDrawing(), elements: items })); const bytes = embedPngScene(new Uint8Array(await blob.arrayBuffer()), { version: 1, elements: items, assetBlobs: workspace.assetBlobs }); blob = new Blob([bytes as BlobPart],{ type: 'image/png' }); }
      if (blob.type !== `image/${format}`) throw new Error('This browser does not support the requested format');
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `drawing.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch (error) { setError(String(error)); } finally { setBusy(false); }
  };
  return <section className="code-panel export-panel" aria-label="Export image"><div className="workspace-heading"><strong>Export image</strong><button onClick={close} aria-label="Close export">×</button></div><label>Format<select value={format} onChange={e => setFormat(e.target.value)}><option value="png">PNG · editable scene included</option><option value="svg">SVG · editable scene included</option><option value="webp">WebP · image only</option></select></label><label>Scale<select value={scale} onChange={e => setScale(Number(e.target.value))}>{[1,2,3].map(n => <option key={n} value={n}>{n}×</option>)}</select></label><label><input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)}/>Transparent background</label><label><input type="checkbox" disabled={!selected} checked={selection} onChange={e => setSelection(e.target.checked)}/>Selection only</label><div className="code-actions"><button disabled={busy} onClick={() => void exportImage()}>{busy ? 'Exporting…' : 'Download'}</button></div>{error && <p role="alert">{error}</p>}</section>;
}
