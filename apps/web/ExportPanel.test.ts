import { expect, test } from 'bun:test';
import { exportBounds } from './ExportPanel';
test('export includes rotated geometry and pen samples beyond endpoint bounds', () => {
  const base = { id: 'one', type: 'rectangle' as const, x: 0, y: 0, width: 100, height: 20, rotation: 90, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
  const bounds = exportBounds([base]);
  expect(bounds.width).toBeCloseTo(68); expect(bounds.height).toBeCloseTo(148);
  const stroke = exportBounds([{ ...base, type: 'pen', rotation: 0, points: [[0,0],[1000,-500],[100,20]] }]);
  expect(stroke.y).toBe(-524); expect(stroke.x + stroke.width).toBe(1024);
});
