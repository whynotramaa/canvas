import{expect,test}from'bun:test';
import{zipSync,strToU8}from'fflate';
import{createWorkspace,createEntry,emptyDrawing}from'./index';
import{subsetWorkspace,mergeWorkspace,writeWorkspaceArchive,readWorkspaceArchive}from'./archive';
test('folder ZIP round trip preserves structure, history, assets and remaps internal drawing links',()=>{
 const source=createWorkspace(),folder=createEntry('folder','Architecture'),other=createEntry('drawing','Linked',folder.id);source.entries[0]!.parentId=folder.id;source.entries.push(folder,other);source.drawings[other.id]=emptyDrawing();
 const e={id:'node',type:'rectangle' as const,x:0,y:0,width:100,height:60,rotation:0,groupIds:[],frameId:null,assetId:'image',startBinding:null,endBinding:null,link:{drawingId:other.id,elementId:'target'}};source.drawings[source.currentId]!.elements=[e];source.drawings[other.id]!.elements=[{...e,id:'target',link:{drawingId:source.currentId}}];source.drawings[source.currentId]!.history.past=[{before:[e],after:[],beforeOrder:['node'],afterOrder:[]}];
 const subset=subsetWorkspace(source,[folder.id]);expect(subset.entries).toHaveLength(3);const archive=readWorkspaceArchive(writeWorkspaceArchive(subset,{image:btoa('image bytes')}));expect(archive.assetBlobs.image).toBe(btoa('image bytes'));expect(archive.drawings[source.currentId]!.history).toEqual(source.drawings[source.currentId]!.history);
 const current=createWorkspace(),merged=mergeWorkspace(current,archive);expect(merged.entries).toHaveLength(4);const imported=merged.drawings[merged.currentId]!,targetId=imported.elements[0]!.link!.drawingId;expect(targetId).not.toBe(other.id);expect(merged.drawings[targetId]!.elements[0]!.id).toBe('target');expect(imported.history.past[0]!.before[0]!.link!.drawingId).toBe(targetId);expect(source.drawings[source.currentId]!.elements[0]!.link!.drawingId).toBe(other.id);
});
test('untrusted ZIP paths, missing drawings, oversized expansion and invalid manifests fail before import',()=>{
 expect(()=>readWorkspaceArchive(zipSync({'../escape':strToU8('x')}))).toThrow('Unsafe');
 expect(()=>readWorkspaceArchive(zipSync({'workspace.json':strToU8('{}')}))).toThrow('Unsupported');
 const source=createWorkspace();expect(()=>readWorkspaceArchive(zipSync({'workspace.json':strToU8(JSON.stringify({...source,archiveVersion:1}))}))).toThrow('missing');
 const bomb=zipSync({'big':new Uint8Array(33*1024*1024)});expect(()=>readWorkspaceArchive(bomb)).toThrow('limits');
});
import{readDrawingFolder}from'./archive';
test('directory imports retain nested paths and native drawing identities before merge',()=>{
 const doc={version:1,id:'stable-drawing',elements:[],assets:{}};
 const result=readDrawingFolder({'Design/System/API.json':strToU8(JSON.stringify(doc))});expect(result.entries.map(e=>e.title)).toEqual(['Design','System','API']);expect(result.entries.at(-1)?.id).toBe('stable-drawing');expect(result.entries.at(-1)?.parentId).toBe(result.entries[1]?.id);
 expect(()=>readDrawingFolder({'a.json':strToU8(JSON.stringify(doc)),'b.json':strToU8(JSON.stringify(doc))})).toThrow('duplicate');
});
