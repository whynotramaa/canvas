import { inflateSync, strFromU8 } from 'fflate';
import type { SceneElement } from './index';
const base = (id: string, type: SceneElement['type'], x: number, y: number, width: number, height: number): SceneElement => ({ id, type, x, y, width, height, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null });
const plain = (html: string) => new DOMParser().parseFromString(`<body>${html.replace(/<br\s*\/?>/gi, '\n')}</body>`, 'text/html').body.textContent || '';
const style = (value: string) => Object.fromEntries(value.split(';').filter(Boolean).map(part => { const [k, v] = part.split('='); return [k!, v ?? '1']; }));
function decodeDiagram(node: Element): Document {
  const inner = node.querySelector('mxGraphModel');
  if (inner) return new DOMParser().parseFromString(new XMLSerializer().serializeToString(inner), 'text/xml');
  const raw = (node.textContent || '').trim(), bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  return new DOMParser().parseFromString(decodeURIComponent(strFromU8(inflateSync(bytes))), 'text/xml');
}
export function importDrawio(text: string): { elements: SceneElement[]; notices: string[] } {
  if (text.length > 10_000_000) throw new Error('draw.io file exceeds 10 MB');
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('draw.io XML could not be parsed');
  const diagrams = [...doc.querySelectorAll('diagram')], models = diagrams.length ? diagrams.map(decodeDiagram) : [doc];
  const elements: SceneElement[] = [], unsupported = new Set<string>(), ids = new Map<string, string>(); let offset = 0;
  for (const model of models) {
    const cells = [...model.querySelectorAll('mxCell')];
    for (const cell of cells) { const id = cell.getAttribute('id'); if (id) ids.set(id, crypto.randomUUID()); }
    let maxX = 0;
    for (const cell of cells) {
      const g = cell.querySelector('mxGeometry'), s = style(cell.getAttribute('style') || ''), id = ids.get(cell.getAttribute('id') || '') || crypto.randomUUID(), text = plain(cell.getAttribute('value') || '').trim() || undefined;
      const num = (name: string) => Number(g?.getAttribute(name) || 0);
      if (cell.getAttribute('vertex') === '1') {
        const type: SceneElement['type'] = s.ellipse || s.shape === 'ellipse' ? 'ellipse' : s.rhombus || s.shape === 'rhombus' ? 'diamond' : s.shape === 'cylinder3' || s.shape === 'cylinder' ? 'cylinder' : s.shape === 'hexagon' ? 'hexagon' : s.shape === 'cloud' ? 'cloud' : s.shape === 'document' ? 'document' : s.shape === 'parallelogram' ? 'parallelogram' : s.text ? 'text' : 'rectangle';
        if (s.shape && !['ellipse', 'rhombus', 'cylinder', 'cylinder3', 'hexagon', 'cloud', 'document', 'parallelogram'].includes(s.shape)) unsupported.add(`shape ${s.shape}`);
        const x = num('x') + offset; maxX = Math.max(maxX, x + num('width'));
        const fill = /^#[0-9a-f]{6}$/i.test(s.fillColor || '') ? s.fillColor : undefined, color = /^#[0-9a-f]{6}$/i.test(s.strokeColor || '') ? s.strokeColor : undefined;
        elements.push({ ...base(id, type, x, num('y'), num('width') || 120, num('height') || 60), text, fill, color, edgeStyle: s.rounded === '1' ? 'round' : undefined, roughness: 0 });
      } else if (cell.getAttribute('edge') === '1') {
        const source = ids.get(cell.getAttribute('source') || ''), target = ids.get(cell.getAttribute('target') || '');
        const point = (as: string) => { const p = g?.querySelector(`mxPoint[as="${as}"]`); return p ? [Number(p.getAttribute('x') || 0) + offset, Number(p.getAttribute('y') || 0)] as [number, number] : null; };
        const start = point('sourcePoint') || [offset, 0], end = point('targetPoint') || [offset + 100, 0];
        elements.push({ ...base(id, 'arrow', start[0], start[1], end[0] - start[0], end[1] - start[1]), startBinding: source || null, endBinding: target || null, startAnchor: source ? [.5, .5] : undefined, endAnchor: target ? [.5, .5] : undefined, text, arrowStyle: s.edgeStyle === 'orthogonalEdgeStyle' ? 'elbow' : undefined, endArrowhead: s.endArrow === 'none' ? 'none' : 'arrow', roughness: 0 });
      }
    }
    offset = maxX + 200;
  }
  const notices = [`Imported ${elements.length} draw.io cells from ${models.length} page(s)`];
  if (unsupported.size) notices.push(`Converted unsupported styles to rectangles: ${[...unsupported].slice(0, 10).join(', ')}. The original file is kept with the drawing.`);
  return { elements, notices };
}
