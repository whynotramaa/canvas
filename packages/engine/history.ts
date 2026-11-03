import type { SceneElement } from '../schema';
export interface Edit { before: SceneElement[]; after: SceneElement[]; beforeOrder: string[]; afterOrder: string[] }
export interface History { past: Edit[]; future: Edit[]; pastPages?:string[]; futurePages?:string[] }
export function record(history: History, before: SceneElement[], after: SceneElement[]): void {
  if(before===after)return;
  const sameOrder=before.length===after.length&&before.every((e,index)=>e.id===after[index]!.id);
  let previous:SceneElement[],next:SceneElement[];
  if(sameOrder){previous=[];next=[];for(let i=0;i<before.length;i++){const a=before[i]!,b=after[i]!;if(a!==b&&JSON.stringify(a)!==JSON.stringify(b)){previous.push(a);next.push(b);}}}
  else{const old=new Map(before.map(e=>[e.id,e])),updated=new Map(after.map(e=>[e.id,e]));const changed=new Set([...old.keys(),...updated.keys()].filter(id=>old.get(id)!==updated.get(id)&&JSON.stringify(old.get(id))!==JSON.stringify(updated.get(id))));previous=before.filter(e=>changed.has(e.id));next=after.filter(e=>changed.has(e.id));}
  if (!previous.length&&!next.length&&sameOrder) return;
  history.past.push({ beforeOrder: sameOrder?[]:before.map(e => e.id), afterOrder: sameOrder?[]:after.map(e => e.id), before:previous, after:next });
  history.future = [];history.futurePages=[];
}
export function applyEdit(elements: SceneElement[], edit: Edit, reverse: boolean): SceneElement[] {
  const remove = new Set((reverse ? edit.after : edit.before).map(e => e.id));
  const sources=new Map((reverse?edit.after:edit.before).map(e=>[e.id,e]));
  const replacements = new Map((reverse ? edit.before : edit.after).map(e => [e.id, e]));
  const result = elements.flatMap(e => {
    const replacement = replacements.get(e.id);
    if (replacement) { replacements.delete(e.id); const source=sources.get(e.id);if(!source)return[e];const merged={...e} as unknown as Record<string,unknown>;for(const key of new Set([...Object.keys(source),...Object.keys(replacement)])){const previous=(source as unknown as Record<string,unknown>)[key],next=(replacement as unknown as Record<string,unknown>)[key];if(JSON.stringify(previous)!==JSON.stringify(next)&&JSON.stringify(merged[key])===JSON.stringify(previous)){if(next===undefined)delete merged[key];else merged[key]=next;}}return[merged as unknown as SceneElement]; }
    return remove.has(e.id) ? [] : [e];
  });
  const order = new Map((reverse ? edit.beforeOrder : edit.afterOrder).map((id, index) => [id, index]));
  if(!order.size)return[...result,...replacements.values()];
  return [...result, ...replacements.values()].sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
}

export function validateHistory(value:unknown):History{
 const history=value as History;if(!history||!Array.isArray(history.past)||!Array.isArray(history.future))throw new Error('Invalid history');
 for(const edit of [...history.past,...history.future])validateEdit(edit);
 for(const pages of [history.pastPages,history.futurePages])if(pages!==undefined&&(!Array.isArray(pages)||!pages.every(id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id))))throw new Error('Invalid history page reference');return history;
}
import{parseDrawing}from'../schema/validation';
export function validateEdit(edit:Edit):Edit{if(!edit||typeof edit!=='object')throw new Error('Invalid history edit');parseDrawing({version:1,elements:edit.before});parseDrawing({version:1,elements:edit.after});if(![edit.beforeOrder,edit.afterOrder].every(order=>Array.isArray(order)&&order.every(id=>typeof id==='string')))throw new Error('Invalid history order');return edit;}
