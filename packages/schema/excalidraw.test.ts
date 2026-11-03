import { expect, test } from 'bun:test';
import { exportExcalidraw, importExcalidraw } from './excalidraw';
import type { SceneElement } from './index';
test('Excalidraw geometry, rotation, pen points and bindings round trip', () => {
  const e: SceneElement = { id: 'one', type: 'pen' as const, x: 10, y: 20, width: 100, height: 50, rotation: 90, groupIds: ['g'], frameId: null, assetId: null, startBinding: null, endBinding: null, points: [[10, 20], [110, 70]] };
  expect(importExcalidraw(exportExcalidraw([e])).elements[0]).toMatchObject(e);
  expect(() => importExcalidraw({ type: 'excalidraw', elements: [{ id: 'a', type: 'rectangle', x: NaN }] })).toThrow();
});
import fixture from './fixtures/excalidraw-v2.json';
test('external Excalidraw assets, bound labels, pressure and anchors convert without native recovery data',()=>{
 const imported=importExcalidraw(fixture);expect(imported.elements).toHaveLength(4);expect(imported.elements[0]).toMatchObject({text:'API',fill:'#f8df86',color:'#123456',strokeWidth:3,opacity:.8});expect(imported.elements[1]).toMatchObject({startBinding:'node',startAnchor:[1,.5],endArrowhead:'triangle-outline'});expect(imported.elements[2]).toMatchObject({assetId:'raster',flipX:true});expect(imported.elements[3]?.pressures).toEqual([.2,.9]);
 const output=exportExcalidraw(imported.elements,imported.assetBlobs) as any;expect(output.files.raster.dataURL).toBe(fixture.files.raster.dataURL);expect(output.elements.find((e:any)=>e.id==='node').boundElements).toContainEqual({id:'edge',type:'arrow'});delete output.canvasNative;const again=importExcalidraw(output);expect(again.elements[0]?.text).toBe('API');expect(again.elements.find(e=>e.id==='pen')?.pressures).toEqual([.2,.9]);expect(again.assetBlobs.raster).toBe(imported.assetBlobs.raster);
});
test('interchange rejects missing images and active SVG or remote raster URLs',()=>{
 const source=structuredClone(fixture);source.files.raster.dataURL='data:image/svg+xml;base64,PHN2Zz4=';expect(()=>importExcalidraw(source)).toThrow();source.files.raster.dataURL='https://example.invalid/pixel.png';expect(()=>importExcalidraw(source)).toThrow();expect(()=>exportExcalidraw(importExcalidraw(fixture).elements)).toThrow('unavailable');
});
