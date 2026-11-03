import type { SceneElement } from '../schema';
import { connectorPoints } from './connectors';
type P = [number, number];
type Box = { minX: number; minY: number; maxX: number; maxY: number };
const box = (e: SceneElement, pad = 0): Box => ({ minX: Math.min(e.x, e.x + e.width) - pad, minY: Math.min(e.y, e.y + e.height) - pad, maxX: Math.max(e.x, e.x + e.width) + pad, maxY: Math.max(e.y, e.y + e.height) + pad });
const hits = (a: P, b: P, r: Box) => {
  if (a[0] === b[0]) return a[0] > r.minX && a[0] < r.maxX && Math.max(a[1], b[1]) > r.minY && Math.min(a[1], b[1]) < r.maxY;
  return a[1] > r.minY && a[1] < r.maxY && Math.max(a[0], b[0]) > r.minX && Math.min(a[0], b[0]) < r.maxX;
};
const length = (path: P[]) => path.slice(1).reduce((sum, p, i) => sum + Math.abs(p[0] - path[i]![0]) + Math.abs(p[1] - path[i]![1]), 0);
const tidy = (path: P[]) => path.filter((p, i) => i === 0 || p[0] !== path[i - 1]![0] || p[1] !== path[i - 1]![1]);
export function elbowRoute(start: P, end: P, obstacles: Box[]): P[] {
  const [sx, sy] = start, [ex, ey] = end, xs = new Set([(sx + ex) / 2]), ys = new Set([(sy + ey) / 2]);
  for (const o of obstacles) { xs.add(o.minX); xs.add(o.maxX); ys.add(o.minY); ys.add(o.maxY); }
  const candidates: P[][] = [[start, [ex, sy], end], [start, [sx, ey], end]];
  for (const x of xs) candidates.push([start, [x, sy], [x, ey], end]);
  for (const y of ys) candidates.push([start, [sx, y], [ex, y], end]);
  for (const x of xs) for (const y of ys) candidates.push([start, [sx, y], [x, y], [x, ey], end], [start, [x, sy], [x, y], [ex, y], end]);
  let best: P[] | null = null, bestScore = Infinity;
  for (const raw of candidates) {
    const path = tidy(raw), crossings = path.slice(1).reduce((n, p, i) => n + obstacles.filter(o => hits(path[i]!, p, o)).length, 0), score = crossings * 1e6 + length(path) + path.length * 4;
    if (score < bestScore) { bestScore = score; best = path; }
  }
  return best!;
}
export function curveRoute(start: P, end: P, bend = .25, samples = 16): P[] {
  const mx = (start[0] + end[0]) / 2, my = (start[1] + end[1]) / 2, dx = end[0] - start[0], dy = end[1] - start[1], cx = mx - dy * bend, cy = my + dx * bend;
  return Array.from({ length: samples + 1 }, (_, i) => { const t = i / samples, u = 1 - t; return [u * u * start[0] + 2 * u * t * cx + t * t * end[0], u * u * start[1] + 2 * u * t * cy + t * t * end[1]] as P; });
}
export function routeConnectors(elements: SceneElement[]): SceneElement[] {
  if (!elements.some(e => e.arrowStyle === 'elbow' || e.arrowStyle === 'curved')) return elements;
  const solids = elements.filter(e => !e.hidden && !['arrow', 'line', 'pen', 'text', 'frame'].includes(e.type));
  return elements.map(e => {
    if ((e.type !== 'arrow' && e.type !== 'line') || (e.arrowStyle !== 'elbow' && e.arrowStyle !== 'curved')) return e;
    const current = connectorPoints(e), start = current[0]!, end = current.at(-1)!;
    const next = e.arrowStyle === 'curved' ? curveRoute(start, end) : elbowRoute(start, end, solids.filter(o => o.id !== e.startBinding && o.id !== e.endBinding && o.id !== e.frameId).map(o => box(o, 12)));
    if (e.points && e.points.length === next.length && e.points.every((p, i) => Math.abs(p[0] - next[i]![0]) < .01 && Math.abs(p[1] - next[i]![1]) < .01)) return e;
    return { ...e, rotation: 0, flipX: false, flipY: false, x: start[0], y: start[1], width: end[0] - start[0], height: end[1] - start[1], points: next };
  });
}
