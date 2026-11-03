import { expect, test } from 'bun:test';
import { bounds, contains, distanceToSegment, intersects, hitTest } from './geometry';

test('normalizes negative dimensions and includes touching boundaries', () => {
  const b = bounds({ x: 10, y: 20, width: -8, height: -12 });
  expect(b).toEqual({ minX: 2, minY: 8, maxX: 10, maxY: 20 });
  expect(contains(b, 2, 8)).toBe(true);
  expect(intersects(b, { minX: 10, minY: 20, maxX: 12, maxY: 22 })).toBe(true);
});
test('measures distance to finite and degenerate segments', () => {
  expect(distanceToSegment(4, 3, 0, 0, 10, 0)).toBe(3);
  expect(distanceToSegment(4, 3, 0, 0, 0, 0)).toBe(5);
  expect(distanceToSegment(12, 0, 0, 0, 10, 0)).toBe(2);
});

test('hit testing follows ellipse, diamond, rotation, and actual pen strokes', () => {
  const e = { id: 'a', type: 'ellipse' as const, x: 0, y: 0, width: 100, height: 100, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null };
  expect(hitTest(e, 0, 0, 0)).toBe(false);
  expect(hitTest(e, 50, 50, 0)).toBe(true);
  expect(hitTest({ ...e, type: 'diamond' }, 10, 10, 0)).toBe(false);
  expect(hitTest({ ...e, type: 'rectangle', height: 20, rotation: 90 }, 50, 50, 0)).toBe(true);
  expect(hitTest({ ...e, type: 'pen', points: [[0, 0], [100, 0], [100, 100]] } as any, 50, 50, 2)).toBe(false);
});

import{rotatePoint,screenToWorld,worldToScreen,selectionBounds}from'./geometry';
test('coordinate transforms invert and rotated bounds match selection extent',()=>{const point={x:-123.5,y:82},view={x:200,y:-400,zoom:.01};expect(screenToWorld(worldToScreen(point,view),view).x).toBeCloseTo(point.x);expect(rotatePoint({x:10,y:0},{x:0,y:0},90).y).toBeCloseTo(10);const e={id:'a',type:'rectangle' as const,x:0,y:0,width:100,height:20,rotation:90,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};const b=selectionBounds([e],new Set(['a']))!;expect(b.minX).toBeCloseTo(40);expect(b.maxY).toBeCloseTo(60);});
test('library-shape hit regions follow actual closed geometry and open strokes',()=>{const e={id:'a',type:'triangle' as const,x:0,y:0,width:100,height:100,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};expect(hitTest(e,1,1,0)).toBe(false);expect(hitTest(e,50,60,0)).toBe(true);expect(hitTest({...e,type:'brace'},10,10,2)).toBe(false);expect(hitTest({...e,type:'line',points:[[0,0],[0,100],[100,100]]},0,50,1)).toBe(true);});
test('rounded rectangles use their curved outline for hit testing',()=>{
 const e={id:'rounded',type:'rectangle' as const,x:0,y:0,width:100,height:100,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,edgeStyle:'round' as const,cornerRadius:40};expect(hitTest(e,0,0,0)).toBe(false);expect(hitTest(e,50,50,0)).toBe(true);expect(hitTest({...e,width:-100},-50,50,0)).toBe(true);
});
