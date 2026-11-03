import { expect, test } from 'bun:test';
import { parseDrawing } from './validation';

test('validates drawing data before import', () => {
  const element = { id: 'a', type: 'rectangle' as const, x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
  expect(parseDrawing({ version: 1, elements: [element] })).toEqual([element]);
  expect(() => parseDrawing({ version: 2, elements: [] })).toThrow();
  expect(() => parseDrawing({ version: 1, elements: [element, element] })).toThrow();
  expect(() => parseDrawing({ version: 1, elements: [{ ...element, x: Infinity }] })).toThrow();
});
