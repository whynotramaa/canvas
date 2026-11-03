import svgpath from 'svgpath';
import { pointsOnPath } from 'points-on-path';
import type { SceneElement } from './index';
const base = (type: SceneElement['type'], x: number, y: number, width: number, height: number): SceneElement => ({ id: crypto.randomUUID(), type, x, y, width, height, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null });
const paint = (value: string | null) => value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : undefined;
function shapeToPath(node: Element): string | null {
  const n = (name: string) => Number(node.getAttribute(name) || 0);
  switch (node.tagName.toLowerCase()) {
    case 'path': return node.getAttribute('d');
    case 'rect': return `M${n('x')} ${n('y')}h${n('width')}v${n('height')}h${-n('width')}Z`;
    case 'circle': return `M${n('cx') - n('r')} ${n('cy')}a${n('r')} ${n('r')} 0 1 0 ${2 * n('r')} 0a${n('r')} ${n('r')} 0 1 0 ${-2 * n('r')} 0Z`;
    case 'ellipse': return `M${n('cx') - n('rx')} ${n('cy')}a${n('rx')} ${n('ry')} 0 1 0 ${2 * n('rx')} 0a${n('rx')} ${n('ry')} 0 1 0 ${-2 * n('rx')} 0Z`;
    case 'line': return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
    case 'polyline': case 'polygon': { const pts = (node.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); if (pts.length < 4 || pts.some(v => !Number.isFinite(v))) return null; let d = `M${pts[0]} ${pts[1]}`; for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`; return node.tagName.toLowerCase() === 'polygon' ? d + 'Z' : d; }
    default: return null;
  }
}
export function importSvg(text: string): { elements: SceneElement[]; notices: string[] } {
  if (text.length > 5_000_000) throw new Error('SVG exceeds 5 MB');
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('SVG could not be parsed');
  const elements: SceneElement[] = [], unsupported = new Set<string>();
  const walk = (node: Element, matrix: string[]) => {
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'foreignobject', 'image', 'use', 'text', 'lineargradient', 'radialgradient', 'filter', 'mask', 'clippath', 'pattern'].includes(tag)) { unsupported.add(tag); return; }
    if (tag === 'defs' || tag === 'metadata' || tag === 'title' || tag === 'desc') return;
    const transforms = node.getAttribute('transform') ? [...matrix, node.getAttribute('transform')!] : matrix;
    const d = shapeToPath(node);
    if (d) {
      let path = svgpath(d); for (const t of transforms) path = path.transform(t);
      const closed = /z\s*$/i.test(d.trim()), stroke = paint(node.getAttribute('stroke')), fill = paint(node.getAttribute('fill'));
      for (const set of pointsOnPath(path.abs().toString(), .5, .3)) {
        if (set.length < 2 || elements.length >= 5000) continue;
        const pts = set.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as [number, number]), first = pts[0]!, last = pts.at(-1)!;
        elements.push({ ...base('line', first[0], first[1], last[0] - first[0], last[1] - first[1]), points: pts, closed: closed && pts.length > 2, color: stroke || (fill ? fill : '#292929'), fill: closed ? fill : undefined, fillStyle: closed && fill ? 'solid' : undefined, roughness: 0 });
      }
    }
    for (const child of node.children) walk(child, transforms);
  };
  walk(doc.documentElement, []);
  const notices = [`Imported ${elements.length} editable paths`];
  if (unsupported.size) notices.push(`Skipped unsupported SVG content: ${[...unsupported].join(', ')}. The original file is kept with the drawing.`);
  if (elements.length >= 5000) notices.push('Stopped at 5,000 paths');
  return { elements, notices };
}
