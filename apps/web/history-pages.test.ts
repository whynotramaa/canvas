import{expect,test}from'bun:test';
import{compactHistory,materializeHistory,HISTORY_PAGE_SIZE}from'./history-pages';
import type{Edit}from'../../packages/engine/history';
import{createWorkspace}from'../../packages/workspace';
const edit=(i:number):Edit=>({before:[],after:[],beforeOrder:[String(i)],afterOrder:[String(i+1)]});
test('history pages bound live memory, deduplicate unchanged content and restore full logical order',async()=>{
 const history={past:Array.from({length:1500},(_,i)=>edit(i)),future:Array.from({length:900},(_,i)=>edit(i+2000))},compacted=await compactHistory(history);expect(compacted.history.past.length).toBeLessThan(768);expect(compacted.history.future.length).toBeLessThan(768);expect(compacted.pages.size).toBeGreaterThan(0);expect(history.past).toHaveLength(1500);expect([...compacted.pages.values()].every(page=>page.length===HISTORY_PAGE_SIZE)).toBe(true);expect((await compactHistory(history)).history.pastPages).toEqual(compacted.history.pastPages);
 const workspace=createWorkspace();workspace.drawings[workspace.currentId]!.history=compacted.history;const hydrated=await materializeHistory(workspace,async id=>compacted.pages.get(id)!);expect(hydrated.drawings[workspace.currentId]!.history).toEqual(history);expect(workspace.drawings[workspace.currentId]!.history.pastPages).toBeDefined();
});
import{takeHistoryEdit}from'./history-pages';
test('undo crosses disk page boundaries in reverse order and redo returns the same edit',async()=>{
 const source={past:Array.from({length:800},(_,i)=>edit(i)),future:[]},compacted=await compactHistory(source);let history=compacted.history;const read=async(id:string)=>compacted.pages.get(id)!;
 for(let i=799;i>=0;i--){const result=await takeHistoryEdit(history,true,read);expect(result.edit?.beforeOrder[0]).toBe(String(i));history=result.history;}
 expect((await takeHistoryEdit(history,true,read)).edit).toBeUndefined();const redo=await takeHistoryEdit(history,false,read);expect(redo.edit?.beforeOrder[0]).toBe('0');expect(source.past).toHaveLength(800);
});
