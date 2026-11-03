export type Keymap = Record<string, string>;
export function canonical(binding: string): string {
  return binding.trim().split(/\s+then\s+/i).map(stroke => { if(stroke.trim()==='+')return'plus';stroke=stroke.replace(/\+\+$/,'+Plus');const parts = stroke.split('+').map(part => part.trim().toLowerCase().replace(/^(cmd|ctrl|control|meta)$/, 'mod')); const key = parts.pop() || ''; const modifiers = ['mod', 'alt', 'shift'].filter(mod => parts.includes(mod)); return [...modifiers, ...parts.filter(part => !modifiers.includes(part)), key].filter(Boolean).join('+'); }).join(' then ');
}
export function parseKeymap(value: unknown): Keymap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Keymap must be an object of action IDs and bindings');
  const result: Keymap = {}, used = new Set<string>();
  for (const [id, binding] of Object.entries(value)) {
    if (!/^[\w-]+$/.test(id) || typeof binding !== 'string' || binding.length > 100 || binding.split(/\s+then\s+/i).length > 2) throw new Error(`Invalid binding for ${id}`);
    const key = canonical(binding); if (key && used.has(key)) throw new Error(`Duplicate binding: ${binding}`);
    if (key) used.add(key); result[id] = binding.trim();
  }
  return result;
}
export function eventBinding(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): string {
  return canonical([event.metaKey || event.ctrlKey ? 'Mod' : '', event.altKey ? 'Alt' : '', event.shiftKey&&event.key!=='+' ? 'Shift' : '', event.key==='+'?'Plus':event.key].filter(Boolean).join('+'));
}
