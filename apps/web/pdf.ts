import type { SceneElement } from '../../packages/schema';
import { intersects } from '../../packages/engine/geometry';
import { visualBounds } from '../../packages/engine/spatial';
import { loadImage } from './assets';
import { draw } from './renderer';

export function slideSize(frame: SceneElement) {
  const width = Math.abs(frame.width), height = Math.abs(frame.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('Each frame must have a width and height of at least 1 pixel.');
  const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(32000000 / (width * height)));
  return { width, height, pixelWidth: Math.max(1, Math.ceil(width * scale)), pixelHeight: Math.max(1, Math.ceil(height * scale)) };
}

export async function exportDeck(frames: SceneElement[], elements: SceneElement[], dark: boolean,clean=false): Promise<Uint8Array> {
  if (!frames.length) throw new Error('Add at least one frame before exporting a deck.');
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  await document.fonts.ready;
  for (const frame of frames) {
    const size = slideSize(frame), bounds = visualBounds(frame);
    const visible = elements.filter(e => e.id !== frame.id && e.type !== 'frame' && !e.hidden && intersects(bounds, visualBounds(e)));
    await Promise.all(visible.flatMap(e => e.type === 'image' && e.assetId ? [loadImage(e.assetId)] : []));
    const canvas = document.createElement('canvas'); canvas.width = size.pixelWidth; canvas.height = size.pixelHeight;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
    ctx.fillStyle = dark ? '#19191d' : '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / size.width, canvas.height / size.height);
    ctx.translate(size.width / 2, size.height / 2); ctx.rotate(-frame.rotation * Math.PI / 180);
    ctx.translate(-(frame.x + frame.width / 2), -(frame.y + frame.height / 2));
    draw(ctx, visible, { x: 0, y: 0, zoom: 1 }, null, dark,[],clean,elements);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not render slide.')), 'image/png'));
    const image = await pdf.embedPng(await blob.arrayBuffer());
    const pageScale = Math.min(1, 14400 / size.width, 14400 / size.height);
    const page = pdf.addPage([size.width * pageScale, size.height * pageScale]);
    page.drawImage(image, { x: 0, y: 0, width: size.width * pageScale, height: size.height * pageScale });
  }
  return pdf.save();
}
