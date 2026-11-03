import katex from 'katex';
const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export function mathMarkup(latex: string): string {
  return katex.renderToString(latex, { output: 'mathml', throwOnError: false, displayMode: true, trust: false, maxSize: 50, maxExpand: 500 });
}
export function mathSvg(latex: string, color: string, width: number, height: number, fontSize = 24): string {
  const w = Math.max(1, Math.abs(width)), h = Math.max(1, Math.abs(height));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><foreignObject width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="color:${escape(color)};font-size:${fontSize}px;display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px">${mathMarkup(latex)}</div></foreignObject></svg>`;
}
