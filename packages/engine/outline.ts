import type { SceneElement } from '../schema';
export function describeElement(element: SceneElement, byId: Map<string, SceneElement>): string {
 const label = (id: string | null) => id ? byId.get(id)?.text || byId.get(id)?.type || 'missing element' : 'free point';
 return [element.text || element.type, element.type === 'arrow' ? `connects ${label(element.startBinding)} to ${label(element.endBinding)}` : '', element.hidden ? 'hidden' : '', element.locked ? 'locked' : ''].filter(Boolean).join(', ');
}
export function outlinePage(elements: SceneElement[], query: string, page: number, size = 100) {
 const byId = new Map(elements.map(e => [e.id, e]));
 const matches = elements.map((element, index) => ({ element, index, description: describeElement(element, byId) })).filter(item => item.description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const pages = Math.max(1, Math.ceil(matches.length / size)), current = Math.min(pages - 1, Math.max(0, page));
 return { items: matches.slice(current * size, (current + 1) * size), total: matches.length, pages, current };
}
