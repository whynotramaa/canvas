import { expect, test } from 'bun:test';
import { frameViewport } from './PresentationPanel';
test('presentation fits negative-size frames around the viewport centre', () => {
  const frame = { id: 'f', type: 'frame' as const, x: 500, y: 400, width: -400, height: -200, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
  const view = frameViewport(frame, 1000, 600);
  expect((frame.x + frame.width / 2) * view.zoom + view.x).toBe(500);
  expect((frame.y + frame.height / 2) * view.zoom + view.y).toBe(300);
  expect(Math.abs(frame.width) * view.zoom).toBeLessThanOrEqual(920);
  expect(Math.abs(frame.height) * view.zoom).toBeLessThanOrEqual(480);
});
