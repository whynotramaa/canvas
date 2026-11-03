import type { SceneElement } from '../schema';
import { distanceToSegment, elementOutline, hitTest, segmentsIntersect, type Point } from './geometry';

export function removeElements(elements: SceneElement[], ids: Set<string>): SceneElement[] {
  ids=new Set(elements.filter(e=>ids.has(e.id)&&!e.locked).map(e=>e.id));
  return elements.filter(e => !ids.has(e.id)).map(e => {
    const start = !!e.startBinding && ids.has(e.startBinding), end = !!e.endBinding && ids.has(e.endBinding), frame = !!e.frameId && ids.has(e.frameId);
    if (!start && !end && !frame) return e;
    return { ...e, startBinding: start ? null : e.startBinding, startAnchor: start ? undefined : e.startAnchor, endBinding: end ? null : e.endBinding, endAnchor: end ? undefined : e.endAnchor, frameId: frame ? null : e.frameId };
  });
}

export function eraseSweep(elements: SceneElement[], from: Point, to: Point, radius: number): string[] {
  const a = [from.x, from.y], b = [to.x, to.y];
  return elements.filter(e => !e.locked && !e.hidden && (
    hitTest(e, from.x, from.y, radius) || hitTest(e, to.x, to.y, radius) || elementOutline(e).some(outline => {
      const points = outline.points, count = outline.closed ? points.length : points.length - 1;
      for (let i = 0; i < count; i++) {
        const c = points[i]!, d = points[(i + 1) % points.length]!;
        if (segmentsIntersect(a, b, c, d) || distanceToSegment(c[0], c[1], from.x, from.y, to.x, to.y) <= radius || distanceToSegment(d[0], d[1], from.x, from.y, to.x, to.y) <= radius) return true;
      }
      return false;
    })
  )).map(e => e.id);
}

import{partialErase}from'./partial-erase';
export function eraseScene(elements:SceneElement[],candidates:SceneElement[],from:Point,to:Point,radius:number,partial=false):SceneElement[]{
 if(!partial)return removeElements(elements,new Set(eraseSweep(candidates,from,to,radius)));
 const ids=new Set(candidates.filter(e=>e.type==='pen').map(e=>e.id)),removed=new Set<string>();const next=elements.flatMap(e=>{if(!ids.has(e.id))return[e];const fragments=partialErase(e,from,to,radius);if(!fragments.length)removed.add(e.id);return fragments;});return removed.size?removeElements(next,removed):next;
}
