import type { SceneElement } from '../schema';
import { refreshBindings } from '../engine/connectors';
export type LayoutKind = 'layered-down' | 'layered-right' | 'tree' | 'radial' | 'force' | 'grid';
const connector = (e: SceneElement) => e.type === 'arrow' || e.type === 'line';
function graphOf(elements: SceneElement[], ids: Set<string>) {
  const byId = new Map(elements.map(e => [e.id, e]));
  const inside = (e: SceneElement) => { let p = e.frameId; while (p) { if (ids.has(p)) return true; p = byId.get(p)?.frameId || null; } return false; };
  const nodes = elements.filter(e => ids.has(e.id) && !connector(e) && !e.hidden && !e.badge && !inside(e));
  const nodeIds = new Set(nodes.map(n => n.id)), lift = (id: string | null) => { let current = id ? byId.get(id) : undefined; while (current && !nodeIds.has(current.id)) current = current.frameId ? byId.get(current.frameId) : undefined; return current?.id; };
  const edges = elements.filter(connector).flatMap(e => { const from = lift(e.startBinding), to = lift(e.endBinding); return from && to && from !== to ? [{ id: e.id, from, to }] : []; });
  return { nodes, edges, byId };
}
function apply(elements: SceneElement[], positions: Map<string, { x: number; y: number }>): SceneElement[] {
  const byId = new Map(elements.map(e => [e.id, e])), delta = new Map<string, [number, number]>();
  for (const [id, p] of positions) { const e = byId.get(id)!; if (!e.pinned && !e.locked) delta.set(id, [p.x - e.x, p.y - e.y]); }
  const shift = (e: SceneElement): [number, number] | undefined => { let current: SceneElement | undefined = e; while (current) { const d = delta.get(current.id); if (d) return d; current = current.frameId ? byId.get(current.frameId) : undefined; } };
  const moved = elements.map(e => { const d = shift(e); if (!d || (!d[0] && !d[1])) return e; return { ...e, x: e.x + d[0], y: e.y + d[1], points: e.points?.map(([x, y]) => [x + d[0], y + d[1]] as [number, number]) }; });
  return refreshBindings(elements, moved);
}
function tree(nodes: SceneElement[], edges: { from: string; to: string }[], radial: boolean) {
  const children = new Map<string, string[]>(), incoming = new Set(edges.map(e => e.to)), seen = new Set<string>();
  for (const e of edges) children.set(e.from, [...(children.get(e.from) || []), e.to]);
  const roots = nodes.filter(n => !incoming.has(n.id)), order: { id: string; depth: number; leaf: number }[] = []; let leaves = 0;
  const visit = (id: string, depth: number): number => { seen.add(id); const kids = (children.get(id) || []).filter(k => !seen.has(k)); if (!kids.length) { order.push({ id, depth, leaf: leaves++ }); return leaves - 1; } const spots = kids.map(k => visit(k, depth + 1)); const leaf = (spots[0]! + spots.at(-1)!) / 2; order.push({ id, depth, leaf }); return leaf; };
  for (const root of roots.length ? roots : nodes.slice(0, 1)) if (!seen.has(root.id)) visit(root.id, 0);
  for (const n of nodes) if (!seen.has(n.id)) visit(n.id, 0);
  const origin = nodes.reduce((p, n) => ({ x: Math.min(p.x, n.x), y: Math.min(p.y, n.y) }), { x: Infinity, y: Infinity }), positions = new Map<string, { x: number; y: number }>(), size = new Map(nodes.map(n => [n.id, n]));
  for (const { id, depth, leaf } of order) {
    const n = size.get(id)!;
    if (radial) { const angle = (leaf / Math.max(1, leaves)) * Math.PI * 2, r = depth * 220; positions.set(id, { x: origin.x + 600 + Math.cos(angle) * r - n.width / 2, y: origin.y + 600 + Math.sin(angle) * r - n.height / 2 }); }
    else positions.set(id, { x: origin.x + leaf * 200, y: origin.y + depth * 160 });
  }
  return positions;
}
function force(nodes: SceneElement[], edges: { from: string; to: string }[]) {
  const p = new Map(nodes.map((n, i) => [n.id, { x: n.x + n.width / 2 + (i % 7), y: n.y + n.height / 2 + (i % 5) }])), k = 220;
  for (let step = 0; step < 300; step++) {
    const force = new Map(nodes.map(n => [n.id, { x: 0, y: 0 }])), t = 30 * (1 - step / 300);
    for (const a of nodes) for (const b of nodes) if (a.id < b.id) { const pa = p.get(a.id)!, pb = p.get(b.id)!, dx = pa.x - pb.x, dy = pa.y - pb.y, d = Math.max(1, Math.hypot(dx, dy)), f = k * k / d; force.get(a.id)!.x += dx / d * f; force.get(a.id)!.y += dy / d * f; force.get(b.id)!.x -= dx / d * f; force.get(b.id)!.y -= dy / d * f; }
    for (const e of edges) { const pa = p.get(e.from)!, pb = p.get(e.to)!, dx = pa.x - pb.x, dy = pa.y - pb.y, d = Math.max(1, Math.hypot(dx, dy)), f = d * d / k; force.get(e.from)!.x -= dx / d * f; force.get(e.from)!.y -= dy / d * f; force.get(e.to)!.x += dx / d * f; force.get(e.to)!.y += dy / d * f; }
    for (const n of nodes) { const f = force.get(n.id)!, d = Math.max(1, Math.hypot(f.x, f.y)), q = p.get(n.id)!; q.x += f.x / d * Math.min(d, t); q.y += f.y / d * Math.min(d, t); }
  }
  return new Map(nodes.map(n => [n.id, { x: p.get(n.id)!.x - n.width / 2, y: p.get(n.id)!.y - n.height / 2 }]));
}
function grid(nodes: SceneElement[]) {
  const columns = Math.ceil(Math.sqrt(nodes.length)), w = Math.max(...nodes.map(n => Math.abs(n.width))) + 60, h = Math.max(...nodes.map(n => Math.abs(n.height))) + 60, x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y));
  return new Map(nodes.map((n, i) => [n.id, { x: x0 + (i % columns) * w, y: y0 + Math.floor(i / columns) * h }]));
}
async function layered(nodes: SceneElement[], edges: { id: string; from: string; to: string }[], direction: 'DOWN' | 'RIGHT') {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js'), elk = new ELK();
  const result = await elk.layout({ id: 'root', layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': direction, 'elk.edgeRouting': 'ORTHOGONAL', 'elk.spacing.nodeNode': '60', 'elk.layered.spacing.nodeNodeBetweenLayers': '90' }, children: nodes.map(n => ({ id: n.id, width: Math.abs(n.width), height: Math.abs(n.height) })), edges: edges.map(e => ({ id: e.id, sources: [e.from], targets: [e.to] })) });
  const x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y));
  return new Map((result.children || []).map(c => [c.id, { x: x0 + (c.x || 0), y: y0 + (c.y || 0) }]));
}
export async function layoutElements(elements: SceneElement[], selection: string[], kind: LayoutKind): Promise<SceneElement[]> {
  const ids = new Set(selection.length ? selection : elements.map(e => e.id)), { nodes, edges } = graphOf(elements, ids);
  if (nodes.length < 2) return elements;
  const positions = kind === 'grid' ? grid(nodes) : kind === 'force' ? force(nodes, edges) : kind === 'tree' || kind === 'radial' ? tree(nodes, edges, kind === 'radial') : await layered(nodes, edges, kind === 'layered-right' ? 'RIGHT' : 'DOWN');
  const result = apply(elements, positions);
  if (kind.startsWith('layered')) { const edgeIds = new Set(edges.map(e => e.id)); return result.map(e => edgeIds.has(e.id) && e.type === 'arrow' && !e.arrowStyle ? { ...e, arrowStyle: 'elbow' } : e); }
  return result;
}
export function tidyElements(elements: SceneElement[], selection: string[], tolerance = 10): SceneElement[] {
  const ids = new Set(selection.length ? selection : elements.map(e => e.id)), { nodes } = graphOf(elements, ids), positions = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]));
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height', sorted = [...nodes].sort((a, b) => (a[axis] + a[size] / 2) - (b[axis] + b[size] / 2)); let cluster: SceneElement[] = [];
    const flush = () => { if (cluster.length > 1) { const mean = cluster.reduce((s, n) => s + n[axis] + n[size] / 2, 0) / cluster.length; for (const n of cluster) positions.get(n.id)![axis] = mean - n[size] / 2; } cluster = []; };
    for (const n of sorted) { const c = n[axis] + n[size] / 2; if (cluster.length && c - (cluster.at(-1)![axis] + cluster.at(-1)![size] / 2) > tolerance) flush(); cluster.push(n); } flush();
  }
  for (const [axis, cross, size] of [['x', 'y', 'width'], ['y', 'x', 'height']] as const) {
    const lanes = new Map<number, SceneElement[]>();
    for (const n of nodes) { const key = Math.round(positions.get(n.id)![cross] + (cross === 'x' ? n.width : n.height) / 2); lanes.set(key, [...(lanes.get(key) || []), n]); }
    for (const lane of lanes.values()) {
      if (lane.length < 3) continue; lane.sort((a, b) => positions.get(a.id)![axis] - positions.get(b.id)![axis]);
      const gaps = lane.slice(1).map((n, i) => positions.get(n.id)![axis] - positions.get(lane[i]!.id)![axis] - lane[i]![size]), mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (mean <= 0 || gaps.some(g => Math.abs(g - mean) > mean * .35)) continue;
      let cursor = positions.get(lane[0]!.id)![axis] + lane[0]![size]; for (const n of lane.slice(1)) { positions.get(n.id)![axis] = cursor + mean; cursor += mean + n[size]; }
    }
  }
  let result = apply(elements, positions);
  const byId = new Map(result.map(e => [e.id, e]));
  result = result.map(e => {
    if (!connector(e) || !e.startBinding || !e.endBinding || e.arrowStyle === 'elbow' || e.points?.length && e.points.length > 2) return e;
    const a = byId.get(e.startBinding), b = byId.get(e.endBinding); if (!a || !b || a.rotation || b.rotation) return e;
    const dx = e.width, dy = e.height;
    if (Math.abs(dy) < Math.abs(dx) * .1) { const y = e.y; if (y >= b.y && y <= b.y + b.height && b.height) return { ...e, height: 0, endAnchor: [e.endAnchor?.[0] ?? .5, (y - b.y) / b.height] as [number, number], points: undefined }; }
    if (Math.abs(dx) < Math.abs(dy) * .1) { const x = e.x; if (x >= b.x && x <= b.x + b.width && b.width) return { ...e, width: 0, endAnchor: [(x - b.x) / b.width, e.endAnchor?.[1] ?? .5] as [number, number], points: undefined }; }
    return e;
  });
  return refreshBindings(result, result);
}
