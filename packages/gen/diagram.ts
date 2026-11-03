import type { SceneElement, ElementType } from '../schema';
import type { Arrowhead } from '../schema/arrowheads';
export type DiagramLanguage = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'mindmap' | 'd2' | 'dsl';
export interface GraphNode { id: string; label: string; shape?: ElementType; parent?: string; container?: boolean; x?: number; y?: number; width?: number; height?: number; line?: number }
export interface GraphEdge { id: string; from: string; to: string; label: string; startHead?: Arrowhead; endHead?: Arrowhead; dashed?: boolean; fromAnchor?: [number, number]; toAnchor?: [number, number]; line?: number }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[]; direction: 'LR' | 'TD'; language?: DiagramLanguage; positioned?: boolean }
export function detectLanguage(source: string): DiagramLanguage {
  const first = source.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('%%') && !l.startsWith('#') && !l.startsWith('//')) || '';
  if (/^(flowchart|graph)\b/.test(first)) return 'flowchart';
  if (/^sequenceDiagram\b/.test(first)) return 'sequence';
  if (/^classDiagram\b/.test(first)) return 'class';
  if (/^stateDiagram(-v2)?\b/.test(first)) return 'state';
  if (/^erDiagram\b/.test(first)) return 'er';
  if (/^gantt\b/.test(first)) return 'gantt';
  if (/^mindmap\b/.test(first)) return 'mindmap';
  if (/^(diagram|direction\s+(LR|TD))\b/.test(first) || /^\w[\w-]*\s*:\s*[^{]*\[[\w-]+\]\s*$/.test(first) || /^group\s/.test(first)) return 'dsl';
  return 'd2';
}
class Builder {
  graph: Graph; nodes = new Map<string, GraphNode>();
  constructor(language: DiagramLanguage) { this.graph = { nodes: [], edges: [], direction: 'TD', language }; }
  node(id: string, label?: string, shape?: ElementType, line?: number, parent?: string) {
    const existing = this.nodes.get(id);
    if (existing) { if (label !== undefined) { existing.label = label; existing.line = line; } if (shape) existing.shape = shape; if (parent && !existing.parent) existing.parent = parent; return id; }
    this.nodes.set(id, { id, label: label ?? id, shape, line, parent }); return id;
  }
  edge(from: string, to: string, label = '', extra: Partial<GraphEdge> = {}) { const count = this.graph.edges.filter(e => e.from === from && e.to === to).length; this.graph.edges.push({ id: `${from}:${to}:${count}`, from, to, label, ...extra }); }
  done() { this.graph.nodes = [...this.nodes.values()]; return this.graph; }
}
const fail = (line: number, message: string): never => { throw new Error(`Line ${line}: ${message}`); };
const lines = (source: string) => source.split(/\r?\n/).map((raw, i) => ({ raw, text: raw.trim().replace(/;$/, ''), n: i + 1 })).filter(l => l.text && !l.text.startsWith('%%'));
const flowShapes: [RegExp, ElementType][] = [[/^\(\((.*)\)\)$/, 'ellipse'], [/^\(\[(.*)\]\)$/, 'rectangle'], [/^\[\((.*)\)\]$/, 'cylinder'], [/^\{\{(.*)\}\}$/, 'hexagon'], [/^\[\/(.*)\/\]$/, 'parallelogram'], [/^\[(.*)\]$/, 'rectangle'], [/^\((.*)\)$/, 'rectangle'], [/^\{(.*)\}$/, 'diamond'], [/^>(.*)\]$/, 'callout']];
function parseFlowchart(source: string): Graph {
  const b = new Builder('flowchart'), parents: string[] = [];
  const node = (token: string, n: number) => {
    const m = token.trim().match(/^([\w-]+)(.*)$/); if (!m) fail(n, 'expected node ID or ID[Label]');
    const [, id, rest] = m!; if (!rest!.trim()) return b.node(id!, undefined, undefined, undefined, parents.at(-1));
    for (const [re, shape] of flowShapes) { const s = rest!.trim().match(re); if (s) return b.node(id!, s[1]!.replace(/^"|"$/g, ''), shape, n, parents.at(-1)); }
    return fail(n, 'expected node ID or ID[Label]');
  };
  for (const { text, n } of lines(source)) {
    const header = text.match(/^(?:flowchart|graph)(?:\s+(LR|RL|TD|TB|BT))?$/); if (header) { b.graph.direction = /LR|RL/.test(header[1] || '') ? 'LR' : 'TD'; continue; }
    if (/^(classDef|class|style|linkStyle|click)\s/.test(text)) continue;
    const sub = text.match(/^subgraph\s+([\w-]+)(?:\s*\[(.*)\])?/); if (sub) { b.node(sub[1]!, sub[2] ?? sub[1], 'frame', n, parents.at(-1)); b.nodes.get(sub[1]!)!.container = true; parents.push(sub[1]!); continue; }
    if (text === 'end') { if (!parents.pop()) fail(n, 'end without subgraph'); continue; }
    const parts = text.split(/\s*(-->|---|-\.->|==>|--\s[^-]+?\s-->)\s*/);
    if (parts.length === 1) { node(text, n); continue; }
    let previous: string | null = null;
    for (let i = 0; i < parts.length; i += 2) {
      let token = parts[i]!, label = '';
      const piped = token.match(/^\|([^|]*)\|\s*(.*)$/); if (piped) { label = piped[1]!; token = piped[2]!; }
      const op = i > 0 ? parts[i - 1]! : ''; const inline = op.match(/^--\s(.+?)\s-->$/); if (inline) label = inline[1]!;
      if (!token.trim()) fail(n, 'edge is missing a node');
      const id = node(token, n);
      if (previous) b.edge(previous, id, label, { dashed: op === '-.->', endHead: op === '---' ? 'none' : 'arrow', line: n });
      previous = id;
    }
  }
  if (parents.length) fail(lines(source).at(-1)?.n || 1, 'subgraph is missing end');
  return b.done();
}
function parseSequence(source: string): Graph {
  const b = new Builder('sequence'), messages: { from: string; to: string; label: string; dashed: boolean; n: number }[] = [];
  for (const { text, n } of lines(source).slice(1)) {
    const p = text.match(/^(participant|actor)\s+([\w-]+)(?:\s+as\s+(.+))?$/); if (p) { b.node(p[2]!, p[3] ?? p[2], p[1] === 'actor' ? 'person' : 'uml-lifeline', n); continue; }
    const m = text.match(/^([\w-]+)\s*(-{1,2}>{1,2}|-{1,2}x|-{1,2}\))\s*([\w-]+)\s*:\s*(.*)$/);
    if (m) { b.node(m[1]!, undefined, 'uml-lifeline'); b.node(m[3]!, undefined, 'uml-lifeline'); messages.push({ from: m[1]!, to: m[3]!, label: m[4]!, dashed: m[2]!.startsWith('--'), n }); continue; }
    if (/^(note|loop|alt|else|opt|par|and|rect|end|activate|deactivate|autonumber)\b/.test(text)) continue;
    fail(n, 'expected participant or message "A->>B: text"');
  }
  const g = b.done(), height = Math.max(240, messages.length * 60 + 140);
  g.nodes.forEach((node, i) => Object.assign(node, { shape: node.shape || 'uml-lifeline', x: i * 220 + 100, y: 100, width: 140, height }));
  messages.forEach((m, i) => { const t = (100 + i * 60) / height; g.edges.push({ id: `msg:${i}`, from: m.from, to: m.to, label: m.label, dashed: m.dashed, fromAnchor: [.5, t], toAnchor: [.5, t], line: m.n }); });
  g.positioned = true; return g;
}
const classHeads: Record<string, [Arrowhead, Arrowhead, boolean]> = { '<|--': ['triangle-outline', 'none', false], '--|>': ['none', 'triangle-outline', false], '*--': ['diamond', 'none', false], '--*': ['none', 'diamond', false], 'o--': ['diamond-outline', 'none', false], '--o': ['none', 'diamond-outline', false], '-->': ['none', 'arrow', false], '<--': ['arrow', 'none', false], '..>': ['none', 'arrow', true], '<..': ['arrow', 'none', true], '..|>': ['none', 'triangle-outline', true], '<|..': ['triangle-outline', 'none', true], '--': ['none', 'none', false], '..': ['none', 'none', true] };
function parseClass(source: string): Graph {
  const b = new Builder('class'), members = new Map<string, string[]>(); let open: string | null = null;
  const touch = (id: string, n?: number) => { if (!members.has(id)) members.set(id, []); b.node(id, undefined, 'uml-class', n); };
  for (const { text, n } of lines(source).slice(1)) {
    if (open) { if (text === '}') { open = null; continue; } members.get(open)!.push(text); continue; }
    const c = text.match(/^class\s+([\w-]+)(?:~\w+~)?\s*(\{)?\s*$/); if (c) { touch(c[1]!, n); if (c[2]) open = c[1]!; continue; }
    const r = text.match(/^([\w-]+)\s*(?:"[^"]*"\s*)?(<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|--|\.\.)\s*(?:"[^"]*"\s*)?([\w-]+)\s*(?::\s*(.*))?$/);
    if (r) { touch(r[1]!); touch(r[3]!); const [s, e, dashed] = classHeads[r[2]!]!; b.edge(r[1]!, r[3]!, r[4] || '', { startHead: s, endHead: e, dashed, line: n }); continue; }
    const m = text.match(/^([\w-]+)\s*:\s*(.+)$/); if (m) { touch(m[1]!); members.get(m[1]!)!.push(m[2]!); continue; }
    if (/^(direction|note|<<)/.test(text)) continue;
    fail(n, 'expected class, member or relationship');
  }
  if (open) fail(lines(source).at(-1)!.n, 'class block is missing }');
  const g = b.done(); for (const node of g.nodes) { const list = members.get(node.id) || []; node.label = [node.id, '───', ...list.filter(m => !m.includes('(')), '───', ...list.filter(m => m.includes('('))].join('\n'); node.width = 200; node.height = Math.max(90, 40 + list.length * 22); }
  return g;
}
function parseState(source: string): Graph {
  const b = new Builder('state'); let starts = 0, ends = 0;
  const id = (token: string, side: 'from' | 'to') => token === '[*]' ? (side === 'from' ? b.node(`start${starts++ ? starts : ''}`, '', 'uml-initial') : b.node(`end${ends++ ? ends : ''}`, '', 'uml-final')) : b.node(token, undefined, 'rectangle');
  for (const { text, n } of lines(source).slice(1)) {
    const alias = text.match(/^state\s+"([^"]+)"\s+as\s+([\w-]+)$/); if (alias) { b.node(alias[2]!, alias[1], 'rectangle', n); continue; }
    const t = text.match(/^(\[\*\]|[\w-]+)\s*-->\s*(\[\*\]|[\w-]+)\s*(?::\s*(.*))?$/); if (t) { b.edge(id(t[1]!, 'from'), id(t[2]!, 'to'), t[3] || '', { line: n }); continue; }
    const d = text.match(/^([\w-]+)\s*:\s*(.+)$/); if (d) { b.node(d[1]!, d[2], 'rectangle', n); continue; }
    if (/^(direction|note|state\s|\}|end note)/.test(text)) continue;
    fail(n, 'expected transition "A --> B"');
  }
  const g = b.done(); for (const node of g.nodes) if (node.shape === 'uml-initial' || node.shape === 'uml-final') { node.width = 36; node.height = 36; } else node.shape = 'rectangle';
  return g;
}
const erHead = (marker: string): Arrowhead => /\|\|/.test(marker) ? 'crow-one' : /[{}]\|/.test(marker) || /\|[{}]/.test(marker) ? 'crow-one-many' : /[{}]/.test(marker) ? 'crow-many' : 'crow-one';
function parseEr(source: string): Graph {
  const b = new Builder('er'), attrs = new Map<string, string[]>(); let open: string | null = null;
  for (const { text, n } of lines(source).slice(1)) {
    if (open) { if (text === '}') { open = null; continue; } attrs.get(open)!.push(text); continue; }
    const block = text.match(/^([\w-]+)\s*\{$/); if (block) { b.node(block[1]!, undefined, 'rectangle', n); attrs.set(block[1]!, attrs.get(block[1]!) || []); open = block[1]!; continue; }
    const r = text.match(/^([\w-]+)\s+([|}o][|o])(--|\.\.)([|o][|{o])\s+([\w-]+)\s*:\s*(.*)$/);
    if (r) { b.node(r[1]!, undefined, 'rectangle'); b.node(r[5]!, undefined, 'rectangle'); b.edge(r[1]!, r[5]!, r[6]!.replace(/^"|"$/g, ''), { startHead: erHead(r[2]!), endHead: erHead(r[4]!), dashed: r[3] === '..', line: n }); continue; }
    if (/^[\w-]+$/.test(text)) { b.node(text, undefined, 'rectangle', n); continue; }
    fail(n, 'expected entity or relationship "A ||--o{ B : label"');
  }
  if (open) fail(lines(source).at(-1)!.n, 'entity block is missing }');
  const g = b.done(); for (const node of g.nodes) { const list = attrs.get(node.id) || []; node.label = [node.id, ...(list.length ? ['───', ...list] : [])].join('\n'); node.width = 200; node.height = Math.max(70, 40 + list.length * 22); }
  return g;
}
function parseGantt(source: string): Graph {
  const b = new Builder('gantt'), tasks: { id: string; label: string; start: number; days: number; section: number; n: number }[] = [], ends = new Map<string, number>(); let section = -1, cursor = 0, origin: number | null = null;
  const day = 864e5, parseDate = (s: string) => { const t = Date.parse(s); return Number.isFinite(t) ? t : null; };
  for (const { text, n } of lines(source).slice(1)) {
    if (/^(title|dateFormat|axisFormat|excludes|todayMarker|tickInterval)\b/.test(text)) continue;
    const s = text.match(/^section\s+(.+)$/); if (s) { section++; b.node(`section${section}`, s[1], 'text', n); continue; }
    const t = text.match(/^(.+?)\s*:\s*(.+)$/); if (!t) fail(n, 'expected "Task : id, start, duration"');
    const fields = t![2]!.split(',').map(f => f.trim()).filter(f => !/^(done|active|crit|milestone)$/.test(f));
    let id = `task${tasks.length}`, start = cursor, days = 1;
    for (const f of fields) {
      const after = f.match(/^after\s+([\w-]+)/), dur = f.match(/^(\d+)([dwh])$/), date = parseDate(f);
      if (after) { if (!ends.has(after[1]!)) fail(n, `unknown task ${after[1]}`); start = ends.get(after[1]!)!; }
      else if (dur) days = Number(dur[1]) * (dur[2] === 'w' ? 7 : dur[2] === 'h' ? 1 / 24 : 1);
      else if (date !== null) { origin ??= date; start = (date - origin) / day; }
      else if (/^[\w-]+$/.test(f)) id = f;
    }
    tasks.push({ id, label: t![1]!, start, days, section: Math.max(0, section), n }); ends.set(id, start + days); cursor = start + days;
  }
  tasks.forEach((task, i) => { b.node(task.id, task.label, 'rectangle', task.n); Object.assign(b.nodes.get(task.id)!, { x: 260 + task.start * 32, y: 100 + i * 50, width: Math.max(16, task.days * 32), height: 36 }); });
  const g = b.done(); let sectionIndex = 0;
  for (const node of g.nodes) if (node.id.startsWith('section')) { const first = tasks.findIndex(t => t.section === sectionIndex++); Object.assign(node, { x: 60, y: 100 + Math.max(0, first) * 50, width: 180, height: 36 }); }
  g.positioned = true; return g;
}
function parseMindmap(source: string): Graph {
  const b = new Builder('mindmap'), stack: { id: string; indent: number }[] = []; let count = 0;
  for (const { raw, text, n } of lines(source).slice(1)) {
    const indent = raw.length - raw.trimStart().length, m = text.match(/^(?:([\w-]+))?\s*(\(\((.*)\)\)|\((.*)\)|\[(.*)\]|\{\{(.*)\}\})?$/);
    const label = m?.[3] ?? m?.[4] ?? m?.[5] ?? m?.[6] ?? text, id = m?.[1] && m[2] ? m[1] : `n${count++}`;
    b.node(id, label, m?.[3] !== undefined ? 'ellipse' : m?.[6] !== undefined ? 'hexagon' : 'rectangle', n);
    while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
    if (stack.length) b.edge(stack.at(-1)!.id, id, '', { endHead: 'none' }); else if (b.nodes.size > 1) fail(n, 'mind map has more than one root');
    stack.push({ id, indent });
  }
  const g = b.done(); g.direction = 'LR'; return g;
}
const d2Shapes: Record<string, ElementType> = { rectangle: 'rectangle', square: 'rectangle', circle: 'ellipse', oval: 'ellipse', diamond: 'diamond', cylinder: 'cylinder', hexagon: 'hexagon', cloud: 'cloud', person: 'person', queue: 'queue', page: 'document', document: 'document', parallelogram: 'parallelogram', text: 'text', stored_data: 'stored-data' };
function parseD2(source: string): Graph {
  const b = new Builder('d2'), scope: string[] = [];
  const full = (path: string) => { const parts = [...scope, ...path.trim().split('.')]; parts.forEach((p, i) => { const id = parts.slice(0, i + 1).join('.'); b.node(id, b.nodes.get(id)?.label ?? p, undefined, undefined, i ? parts.slice(0, i).join('.') : undefined); if (i < parts.length - 1) b.nodes.get(id)!.container = true; }); return parts.join('.'); };
  for (const { raw, n } of lines(source).map(l => ({ ...l, raw: l.text.replace(/\s+#.*$/, '') }))) {
    const text = raw.trim(); if (!text || text.startsWith('#')) continue;
    if (text === '}') { if (!scope.pop()) fail(n, 'unexpected }'); continue; }
    const dir = text.match(/^direction\s*:\s*(right|left|down|up)$/); if (dir) { b.graph.direction = /right|left/.test(dir[1]!) ? 'LR' : 'TD'; continue; }
    const edge = text.split(/\s*(<->|->|<-|--)\s*/);
    if (edge.length > 1) {
      const last = edge.at(-1)!, [target, ...label] = last.split(':'); edge[edge.length - 1] = target!;
      for (let i = 0; i + 2 < edge.length; i += 2) { const op = edge[i + 1]!, a = full(edge[i]!), c = full(edge[i + 2]!); if (op === '<-') b.edge(c, a, label.join(':').trim(), { line: n }); else b.edge(a, c, label.join(':').trim(), { startHead: op === '<->' ? 'arrow' : 'none', endHead: op === '--' ? 'none' : 'arrow', line: n }); }
      continue;
    }
    const shape = text.match(/^([\w.-]+)\.shape\s*:\s*(\w+)$/); if (shape) { const id = full(shape[1]!); if (!d2Shapes[shape[2]!]) fail(n, `unsupported shape ${shape[2]}`); b.nodes.get(id)!.shape = d2Shapes[shape[2]!]; continue; }
    if (/^[\w.-]+\.(style|label|icon|width|height|near|tooltip|link)/.test(text)) continue;
    const decl = text.match(/^([\w.-]+)\s*(?::\s*([^{]*?))?\s*(\{)?$/);
    if (decl) { const id = full(decl[1]!); if (decl[2]) { b.nodes.get(id)!.label = decl[2].replace(/^"|"$/g, ''); b.nodes.get(id)!.line = n; } if (decl[3]) { b.nodes.get(id)!.container = true; scope.push(...decl[1]!.split('.')); } continue; }
    fail(n, 'expected "a -> b: label", "a: Label" or "a.shape: circle"');
  }
  if (scope.length) fail(lines(source).at(-1)?.n || 1, 'block is missing }');
  const g = b.done(); for (const node of g.nodes) if (node.container) node.shape = 'frame'; return g;
}
function parseDsl(source: string): Graph {
  const b = new Builder('dsl'), groups: string[] = [];
  for (const { text, n } of lines(source)) {
    if (text.startsWith('#') || text.startsWith('//') || text === 'diagram') continue;
    const dir = text.match(/^direction\s+(LR|TD)$/); if (dir) { b.graph.direction = dir[1] as 'LR' | 'TD'; continue; }
    const group = text.match(/^group\s+([\w-]+)(?:\s*:\s*(.+))?$/); if (group) { b.node(group[1]!, group[2] ?? group[1], 'frame', n, groups.at(-1)); b.nodes.get(group[1]!)!.container = true; groups.push(group[1]!); continue; }
    if (text === 'end') { if (!groups.pop()) fail(n, 'end without group'); continue; }
    const edge = text.match(/^([\w-]+)\s*(->|<->|--)\s*([\w-]+)\s*(?::\s*(.*))?$/); if (edge) { b.node(edge[1]!, undefined, undefined, undefined, groups.at(-1)); b.node(edge[3]!, undefined, undefined, undefined, groups.at(-1)); b.edge(edge[1]!, edge[3]!, edge[4] || '', { startHead: edge[2] === '<->' ? 'arrow' : 'none', endHead: edge[2] === '--' ? 'none' : 'arrow', line: n }); continue; }
    const node = text.match(/^([\w-]+)\s*:\s*(.*?)\s*(?:\[([\w-]+)\])?$/); if (node) { b.node(node[1]!, node[2] || node[1], node[3] as ElementType | undefined, n, groups.at(-1)); continue; }
    fail(n, 'expected "id: Label [shape]", "a -> b: label", "group id: Label" or "end"');
  }
  if (groups.length) fail(lines(source).at(-1)?.n || 1, 'group is missing end');
  return b.done();
}
const parsers: Record<DiagramLanguage, (s: string) => Graph> = { flowchart: parseFlowchart, sequence: parseSequence, class: parseClass, state: parseState, er: parseEr, gantt: parseGantt, mindmap: parseMindmap, d2: parseD2, dsl: parseDsl };
export function parseDiagram(source: string): Graph {
  if (source.length > 200000) throw new Error('Diagram source exceeds 200 KB');
  const language = detectLanguage(source), graph = parsers[language](source);
  graph.language = language;
  for (const e of graph.edges) if (!graph.nodes.some(n => n.id === e.from) || !graph.nodes.some(n => n.id === e.to)) throw new Error('Unresolved diagram edge');
  if (graph.nodes.length > 2000) throw new Error('Diagram exceeds 2,000 nodes');
  return graph;
}
const base = (id: string, type: SceneElement['type'], x: number, y: number, width: number, height: number): SceneElement => ({ id, type, x, y, width, height, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null });
function rankLayout(graph: Graph) {
  const rank = new Map<string, number>(graph.nodes.filter(n => !n.container).map(n => [n.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) { let changed = false; for (const e of graph.edges) { const a = rank.get(e.from), b = rank.get(e.to); if (a !== undefined && b !== undefined && b < a + 1 && a + 1 < graph.nodes.length) { rank.set(e.to, a + 1); changed = true; } } if (!changed) break; }
  const columns = new Map<number, number>(), place = new Map<string, { x: number; y: number }>();
  for (const [id, r] of rank) { const i = columns.get(r) || 0; columns.set(r, i + 1); place.set(id, graph.direction === 'LR' ? { x: 100 + r * 260, y: 100 + i * 130 } : { x: 100 + i * 220, y: 100 + r * 150 }); }
  return place;
}
export function graphToElements(graph: Graph, previous: SceneElement[] = []): SceneElement[] {
  const old = new Map(previous.map(e => [e.id, e])), place = graph.positioned ? null : rankLayout(graph);
  const nodes = graph.nodes.map(n => {
    const p = place?.get(n.id), id = `diagram:${n.id}`, prior = old.get(id), type = n.shape || 'rectangle';
    const fresh = { ...base(id, type, n.x ?? p?.x ?? 100, n.y ?? p?.y ?? 100, n.width ?? (type === 'ellipse' ? 120 : 160), n.height ?? 70), container: n.container || undefined, autoSize: n.container || undefined };
    return { ...fresh, ...(prior && !graph.positioned ? prior : prior ? { color: prior.color, fill: prior.fill, fillStyle: prior.fillStyle, strokeWidth: prior.strokeWidth, strokeStyle: prior.strokeStyle, roughness: prior.roughness, opacity: prior.opacity, fontFamily: prior.fontFamily, fontSize: prior.fontSize } : {}), type, id, text: n.label, frameId: n.parent ? `diagram:${n.parent}` : null } as SceneElement;
  });
  const byId = new Map(nodes.map(e => [e.id, e]));
  const edges = graph.edges.map(e => {
    const from = byId.get(`diagram:${e.from}`)!, to = byId.get(`diagram:${e.to}`)!, fa = e.fromAnchor || [.5, .5], ta = e.toAnchor || [.5, .5];
    const x = from.x + from.width * fa[0], y = from.y + from.height * fa[1], id = `diagram:edge:${e.id}`, prior = old.get(id);
    return { ...prior, ...base(id, 'arrow', x, y, to.x + to.width * ta[0] - x, to.y + to.height * ta[1] - y), startBinding: from.id, endBinding: to.id, startAnchor: fa, endAnchor: ta, text: e.label || undefined, startArrowhead: e.startHead, endArrowhead: e.endHead ?? 'arrow', strokeStyle: e.dashed ? 'dashed' : prior?.strokeStyle, points: undefined } as SceneElement;
  });
  return [...nodes.filter(n => n.container), ...edges, ...nodes.filter(n => !n.container)];
}
const isDiagramNode = (e: SceneElement) => e.id.startsWith('diagram:') && !e.id.startsWith('diagram:edge:');
export function elementsToGraph(elements: SceneElement[]): Graph {
  const nodes = elements.filter(isDiagramNode).map(e => ({ id: e.id.slice(8), label: e.text || '', shape: e.type, parent: e.frameId?.startsWith('diagram:') ? e.frameId.slice(8) : undefined, container: e.container }));
  const ids = new Set(nodes.map(n => n.id)), edges: GraphEdge[] = [];
  for (const e of elements) if ((e.type === 'arrow' || e.type === 'line') && e.startBinding?.startsWith('diagram:') && e.endBinding?.startsWith('diagram:')) { const from = e.startBinding.slice(8), to = e.endBinding.slice(8); if (ids.has(from) && ids.has(to)) edges.push({ id: e.id.startsWith('diagram:edge:') ? e.id.slice(13) : `${from}:${to}:new${edges.length}`, from, to, label: e.text || '', startHead: e.startArrowhead, endHead: e.endArrowhead ?? 'arrow', dashed: e.strokeStyle === 'dashed' }); }
  return { nodes, edges, direction: 'TD' };
}
const shapeToken: Partial<Record<ElementType, [string, string]>> = { rectangle: ['[', ']'], diamond: ['{', '}'], ellipse: ['((', '))'], cylinder: ['[(', ')]'], hexagon: ['{{', '}}'], parallelogram: ['[/', '/]'] };
const clean = (s: string) => s.replace(/[\[\]{}()|\n"]/g, ' ').trim();
function nodeLine(n: GraphNode, language: DiagramLanguage) {
  if (language === 'd2') return `${n.id}: ${clean(n.label)}`;
  if (language === 'dsl') return `${n.id}: ${clean(n.label)}${n.shape && n.shape !== 'rectangle' ? ` [${n.shape}]` : ''}`;
  const [a, b] = shapeToken[n.shape || 'rectangle'] || ['[', ']']; return `  ${n.id}${a}${clean(n.label)}${b}`;
}
function edgeLine(e: GraphEdge, language: DiagramLanguage) {
  if (language === 'd2' || language === 'dsl') return `${e.from} ${e.endHead === 'none' ? '--' : e.startHead === 'arrow' ? '<->' : '->'} ${e.to}${e.label ? `: ${clean(e.label)}` : ''}`;
  return `  ${e.from} ${e.dashed ? '-.->' : e.endHead === 'none' ? '---' : '-->'}${e.label ? `|${clean(e.label)}|` : ''} ${e.to}`;
}
export function elementsToMermaid(elements: SceneElement[]): string {
  const nodes = elements.filter(e => e.type !== 'arrow' && e.type !== 'line');
  if (nodes.some(e => !shapeToken[e.type])) throw new Error('Only rectangles, diamonds, ellipses, cylinders, hexagons and parallelograms can be represented in a Mermaid flowchart');
  const ids = new Map(nodes.map((e, i) => [e.id, e.id.startsWith('diagram:') ? e.id.slice(8).replace(/[^\w-]/g, '_') : `node${i}`]));
  const lines = nodes.map(e => nodeLine({ id: ids.get(e.id)!, label: e.text || e.type, shape: e.type }, 'flowchart'));
  for (const e of elements.filter(e => e.type === 'arrow' || e.type === 'line')) { const from = ids.get(e.startBinding || ''), to = ids.get(e.endBinding || ''); if (!from || !to) throw new Error('Connect every arrow to nodes before exporting Mermaid'); lines.push(edgeLine({ id: '', from, to, label: e.text || '', endHead: e.type === 'line' ? 'none' : e.endArrowhead ?? 'arrow', dashed: e.strokeStyle === 'dashed' }, 'flowchart')); }
  return ['flowchart TD', ...lines].join('\n');
}
export function syncSource(source: string, elements: SceneElement[]): { source: string; unsupported: string[] } {
  const parsed = parseDiagram(source), language = parsed.language!, canvas = elementsToGraph(elements), unsupported: string[] = [];
  const before = new Map(parsed.nodes.map(n => [n.id, n])), after = new Map(canvas.nodes.map(n => [n.id, n]));
  const beforeEdges = new Map(parsed.edges.map(e => [e.id, e])), afterEdges = new Map(canvas.edges.map(e => [e.id, e]));
  const structural = ['flowchart', 'd2', 'dsl'].includes(language), out = source.split(/\r?\n/), remove = new Set<number>(), append: string[] = [];
  for (const [id, node] of before) {
    const next = after.get(id); if (node.container) continue;
    if (!next) { if (structural) { if (node.line) remove.add(node.line - 1); for (const e of parsed.edges) if ((e.from === id || e.to === id) && e.line) remove.add(e.line - 1); } else unsupported.push(`deleting ${id}`); continue; }
    if (language === 'class' || language === 'er') { if (next.label.split('\n')[0] !== node.label.split('\n')[0]) unsupported.push(`renaming ${id}`); continue; }
    if (next.label !== node.label) {
      if (node.line && out[node.line - 1]!.includes(node.label)) out[node.line - 1] = out[node.line - 1]!.replace(node.label, clean(next.label));
      else if (structural) append.push(nodeLine(next, language)); else unsupported.push(`relabelling ${id}`);
    }
  }
  for (const [id, node] of after) if (!before.has(id)) { if (structural) append.push(nodeLine(node, language)); else unsupported.push(`adding ${id}`); }
  for (const [id, edge] of beforeEdges) if (!afterEdges.has(id)) { if (structural && edge.line && !remove.has(edge.line - 1)) { const parts = out[edge.line - 1]!.split(/-->|---|-\.->|==>|->|<->|--/); if (parts.length <= 2) remove.add(edge.line - 1); else unsupported.push(`removing edge ${id} from a chained line`); } else if (!structural) unsupported.push(`removing edge ${id}`); }
  for (const [id, edge] of afterEdges) {
    const prior = beforeEdges.get(id);
    if (!prior) { if (structural) append.push(edgeLine(edge, language)); else unsupported.push(`adding an edge ${edge.from} → ${edge.to}`); continue; }
    if (prior.label !== edge.label) { if (prior.line && prior.label && out[prior.line - 1]!.includes(prior.label)) out[prior.line - 1] = out[prior.line - 1]!.replace(prior.label, clean(edge.label)); else if (structural && prior.line && !remove.has(prior.line - 1) && out[prior.line - 1]!.split(/-->|---|-\.->|==>|->|<->|--/).length <= 2) out[prior.line - 1] = edgeLine(edge, language); else unsupported.push(`labelling edge ${id}`); }
  }
  const result = [...out.filter((_, i) => !remove.has(i)), ...append].join('\n');
  return { source: result, unsupported };
}
