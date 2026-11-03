import { expect, test } from 'bun:test';
import { slideSize } from './pdf';

test('PDF slide dimensions handle negative and oversized frames and reject empty frames', () => {
  const frame = { id: 'f', type: 'frame' as const, x: 0, y: 0, width: -400, height: 200, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
  expect(slideSize(frame)).toEqual({ width: 400, height: 200, pixelWidth: 800, pixelHeight: 400 });
  const big = slideSize({ ...frame, width: 30000, height: 30000 });
  expect(big.pixelWidth * big.pixelHeight).toBeLessThanOrEqual(32010000);
  expect(() => slideSize({ ...frame, width: 0 })).toThrow();
});

test('deck creates one page per frame with matching dimensions', async () => {
  const { exportDeck } = await import('./pdf');
  const { PDFDocument } = await import('pdf-lib');
  const previous = globalThis.document;
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII='), c => c.charCodeAt(0));
  const context: { canvas?: unknown; fillStyle: string; fillRect: () => void; scale: () => void; translate: () => void; rotate: () => void; save: () => void; restore: () => void } = { fillStyle: '', fillRect() {}, scale() {}, translate() {}, rotate() {}, save() {}, restore() {} };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (cb: (blob: Blob) => void) => cb(new Blob([png], { type: 'image/png' })) };
  context.canvas = canvas;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: { ready: Promise.resolve() }, createElement: () => canvas } });
  try {
    const frame = { id: 'f', type: 'frame' as const, x: 0, y: 0, width: 400, height: 200, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
    const bytes = await exportDeck([frame, { ...frame, id: 'g', width: 100, height: 300 }], [], false);
    const pages = (await PDFDocument.load(bytes)).getPages();
    expect(pages).toHaveLength(2);
    expect(pages[0]!.getSize()).toEqual({ width: 400, height: 200 });
    expect(pages[1]!.getSize()).toEqual({ width: 100, height: 300 });
    await expect(exportDeck([], [], false)).rejects.toThrow();
  } finally { Object.defineProperty(globalThis, 'document', { configurable: true, value: previous }); }
});
