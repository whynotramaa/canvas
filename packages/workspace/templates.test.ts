import { expect, test } from 'bun:test';
import { starterTemplates } from './templates';
import { parseDrawing } from '../schema/validation';
test('all ten starter templates use unique editable nodes and valid bindings', () => {
  expect(starterTemplates).toHaveLength(10);
  const previous = new Set<string>();
  for (const template of starterTemplates) {
    const elements = template.create(); parseDrawing({ version: 1, elements }); const ids = new Set(elements.map(e => e.id));
    for (const element of elements) { expect(previous.has(element.id)).toBe(false); previous.add(element.id); for (const binding of [element.startBinding, element.endBinding]) if (binding) expect(ids.has(binding)).toBe(true); }
  }
});
test('starter templates contain the notation and structures their names promise',()=>{
 const get=(title:string)=>starterTemplates.find(t=>t.title===title)!.create();expect(get('ER diagram').filter(e=>e.type==='table')).toHaveLength(3);expect(get('Sequence diagram').filter(e=>e.type==='arrow')).toHaveLength(6);expect(get('Flowchart').some(e=>e.type==='diamond')).toBe(true);for(const title of ['Kanban','Retro board','Wireframe kit']){const scene=get(title),frames=new Set(scene.filter(e=>e.type==='frame').map(e=>e.id));expect(frames.size).toBeGreaterThan(0);expect(scene.some(e=>e.frameId&&frames.has(e.frameId))).toBe(true);}expect(get('Sprint planning').some(e=>e.type==='table')).toBe(true);
});
