import { expect, test } from 'bun:test';
import { shapeNames, shapePath } from './shapes';
import { parseDrawing } from '../schema/validation';
import { exportSvg } from '../schema/svg';
import { importExcalidraw, exportExcalidraw } from '../schema/excalidraw';
test('library paths support negative dimensions, SVG export and lossless native recovery', () => {
  for (const type of shapeNames) {
    const e = { id: type, type, x: 300, y: 200, width: -160, height: -100, rotation: 45, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
    parseDrawing({ version: 1, elements: [e] });
    const path = shapePath(e)!;
    expect(path.startsWith('M')).toBe(true); expect(path).not.toMatch(/NaN|Infinity|undefined/);
    expect(exportSvg([e])).toContain('<path d=');
    expect(importExcalidraw(exportExcalidraw([e])).elements).toEqual([e]);
  }
});
