import{refreshBindings}from'./connectors';
import type { SceneElement } from '../schema';
export function moveWithBindings(elements: SceneElement[], ids: Set<string>, dx: number, dy: number): SceneElement[] {
  const moved = new Set(elements.filter(e=>ids.has(e.id)&&!e.locked).map(e=>e.id));
  const groups = new Set(elements.filter(e => moved.has(e.id)).flatMap(e => e.groupIds));
  let changed=true; while(changed){changed=false;for(const e of elements)if(!moved.has(e.id)&&((e.frameId&&moved.has(e.frameId))||e.groupIds.some(id=>groups.has(id)))){moved.add(e.id);changed=true;}}
  const result=elements.map(e => {
    if (moved.has(e.id)) return { ...e, x: e.x + dx, y: e.y + dy, points: e.points?.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
    if (e.type !== 'arrow' && e.type !== 'line') return e;
    const start = !!e.startBinding && moved.has(e.startBinding), end = !!e.endBinding && moved.has(e.endBinding);if(!start&&!end)return e;
    return { ...e, x: e.x + (start ? dx : 0), y: e.y + (start ? dy : 0), width: e.width + (end ? dx : 0) - (start ? dx : 0), height: e.height + (end ? dy : 0) - (start ? dy : 0),points:e.points?.map(([x,y],i)=>{const move=(start&&end)||(start&&i===0)||(end&&i===e.points!.length-1);return[x+(move?dx:0),y+(move?dy:0)]as[number,number];}) };
  });
  return refreshBindings(elements,result);
}
export function layoutGrid(elements: SceneElement[], ids: Set<string>, columns = 3): SceneElement[] {
  const selected = elements.filter(e => ids.has(e.id) && e.type !== 'arrow' && e.type !== 'line');
  if (!selected.length) return elements;
  const x = Math.min(...selected.map(e => e.x)), y = Math.min(...selected.map(e => e.y));
  const width = Math.max(...selected.map(e => Math.abs(e.width))) + 60, height = Math.max(...selected.map(e => Math.abs(e.height))) + 60;
  let result = elements;
  selected.forEach((e, i) => { result = moveWithBindings(result, new Set([e.id]), x + i % columns * width - e.x, y + Math.floor(i / columns) * height - e.y); });
  return result;
}
