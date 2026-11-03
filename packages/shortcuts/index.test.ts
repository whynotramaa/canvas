import { expect, test } from 'bun:test';
import { ActionRegistry } from './index';
test('actions are searchable and duplicate identifiers fail', () => {
  const registry = new ActionRegistry();
  const action = { id: 'undo', label: 'Undo', category: 'Edit', binding: 'Mod+Z', run() {} };
  registry.register(action);
  expect(registry.search('edit z')).toEqual([action]);
  expect(() => registry.register(action)).toThrow();
});

import { canonical, eventBinding, parseKeymap } from './keymap';
test('keymaps normalize platform modifiers, chords and reject duplicates', () => {
  expect(canonical('Shift+Ctrl+D')).toBe('mod+shift+d');
  expect(canonical('Cmd+Shift+D')).toBe('mod+shift+d');
  expect(canonical('G then A')).toBe('g then a');
  expect(eventBinding({ key: 'D', metaKey: false, ctrlKey: true, altKey: false, shiftKey: true })).toBe('mod+shift+d');
  expect(() => parseKeymap({ one: 'Cmd+K', two: 'Ctrl+K' })).toThrow('Duplicate');
  expect(parseKeymap({ one: '', two: '' })).toEqual({ one: '', two: '' });
});
test('palette fuzzy matches and recent command ranking share registry execution',()=>{
 let executed='';const recent=['fit'],registry=new ActionRegistry(id=>executed=id,recent);registry.register({id:'fit',label:'Zoom to fit',category:'View',binding:'Shift+1',run(){}});registry.register({id:'group',label:'Group selection',category:'Edit',binding:'Mod+G',run(){}});expect(registry.search()[0]?.id).toBe('fit');expect(registry.search('grp sel')[0]?.id).toBe('group');registry.search('fit')[0]!.run();expect(executed).toBe('fit');expect(registry.search('unmatchable')).toHaveLength(0);
});
