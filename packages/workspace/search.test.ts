import{expect,test}from'bun:test';
import{createWorkspace,createEntry,emptyDrawing,moveEntries,trashEntries}from'./index';
import{WorkspaceSearchIndex}from'./search';
test('incremental search covers fuzzy names, paths, labels, frames, notes, and table cells',()=>{
 const workspace=createWorkspace(),id=workspace.currentId;workspace.entries[0]!.title='System architecture';const folder=createEntry('folder','Production');workspace.entries.push(folder);workspace.entries[0]!.parentId=folder.id;
 const node={id:'a',type:'rectangle' as const,text:'Client API',x:0,y:0,width:10,height:10,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};workspace.drawings[id]!.elements=[node,{...node,id:'table',type:'table',text:undefined,cells:[['Latency','42ms']]},{...node,id:'frame',type:'frame',text:'Overview',notes:'Deploy gradually'}];
 const index=new WorkspaceSearchIndex();expect(index.sync(workspace)).toBe(1);expect(index.search('sys arch')[0]?.entry.id).toBe(id);expect(index.search('prod api').some(r=>r.elementId==='a')).toBe(true);expect(index.search('42ms')[0]?.elementId).toBe('table');expect(index.search('deploy gradually')[0]?.elementId).toBe('frame');expect(index.sync({...workspace})).toBe(0);
 const moved=moveEntries(workspace,[id],null);expect(index.sync(moved)).toBe(0);expect(index.search('production')).toHaveLength(0);
 moved.drawings[id]={...moved.drawings[id]!,elements:[{...node,text:'Renamed service'}]};expect(index.sync(moved)).toBe(1);expect(index.search('client')).toHaveLength(0);expect(index.search('renamed')[0]?.elementId).toBe('a');
 index.sync(trashEntries(moved,[id]));expect(index.search('service')).toHaveLength(0);index.sync(trashEntries(trashEntries(moved,[id]),[id],true));expect(index.search('service')).toHaveLength(1);
 const other=createEntry('drawing','Other');moved.entries.push(other);moved.drawings[other.id]=emptyDrawing();expect(index.sync(moved)).toBe(1);
});
