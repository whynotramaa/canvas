import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { ancestors, isTrashed, validateWorkspace, type Workspace } from './index';

export function subsetWorkspace(workspace:Workspace,selected:string[]):Workspace{
 const ids=new Set(selected),entries=workspace.entries.filter(e=>!isTrashed(workspace,e)&&(ids.has(e.id)||ancestors(workspace,e.id).some(a=>ids.has(a.id))));
 const included=new Set(entries.map(e=>e.id));
 return {...workspace,currentId:included.has(workspace.currentId)?workspace.currentId:entries.find(e=>e.kind==='drawing')?.id||'',entries:entries.map(e=>({...e,parentId:e.parentId&&included.has(e.parentId)?e.parentId:null})),drawings:Object.fromEntries(entries.filter(e=>e.kind==='drawing').map(e=>[e.id,workspace.drawings[e.id]!]))};
}
export function mergeWorkspace(current:Workspace,source:Workspace,parentId:string|null=null):Workspace{
 validateWorkspace(current);validateWorkspace(source);
 if(parentId&&!current.entries.some(e=>e.id===parentId&&e.kind==='folder'&&!isTrashed(current,e)))throw new Error('Import destination is unavailable');
 const imported=structuredClone(source),ids=new Map(imported.entries.map(e=>[e.id,crypto.randomUUID()])),componentIds=new Map((imported.components||[]).map(c=>[c.id,crypto.randomUUID()]));
 const remapElement=(element:import('../schema').SceneElement)=>{if(element.link&&ids.has(element.link.drawingId))element.link={...element.link,drawingId:ids.get(element.link.drawingId)!};if(element.component&&componentIds.has(element.component.definitionId))element.component={...element.component,definitionId:componentIds.get(element.component.definitionId)!};};
 for(const drawing of Object.values(imported.drawings)){
  const elements=[...drawing.elements,...drawing.history.past.flatMap(e=>[...e.before,...e.after]),...drawing.history.future.flatMap(e=>[...e.before,...e.after]),...(drawing.snapshots||[]).flatMap(s=>s.elements)];
  for(const element of elements)remapElement(element);
 }
 for(const component of imported.components||[]){component.id=componentIds.get(component.id)!;component.drawingId=ids.get(component.drawingId)||component.drawingId;for(const element of component.elements)remapElement(element);}
 const result={...current,components:[...(current.components||[]),...(imported.components||[])],styles:[...(current.styles||[]),...(imported.styles||[]).map(style=>({...style,id:crypto.randomUUID()}))],currentId:ids.get(imported.currentId)||current.currentId,entries:[...current.entries,...imported.entries.map(e=>({...e,id:ids.get(e.id)!,parentId:e.parentId?ids.get(e.parentId)!:parentId}))],drawings:{...current.drawings,...Object.fromEntries(Object.entries(imported.drawings).map(([id,drawing])=>[ids.get(id)!,drawing]))}};
 return validateWorkspace(result);
}
const documentPath=(id:string)=>`drawings/${encodeURIComponent(id)}.json`;
const assetPath=(id:string)=>`assets/${id}`;
function safePath(path:string){if(path.length>512||path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>part==='..'||part==='.')||/^[a-z]:/i.test(path)||path.includes('\0'))throw new Error('Unsafe archive path');}
export function writeWorkspaceArchive(workspace:Workspace,assets:Record<string,string>):Uint8Array{
 validateWorkspace(workspace);const files:Record<string,Uint8Array>=Object.create(null);
 const manifest={...workspace,drawings:{},archiveVersion:1}as Workspace&{assetBlobs?:unknown;archiveVersion:number};delete manifest.assetBlobs;files['workspace.json']=strToU8(JSON.stringify(manifest));
 for(const[id,drawing]of Object.entries(workspace.drawings))files[documentPath(id)]=strToU8(JSON.stringify({...drawing,id}));
 const assetIds=new Set<string>((workspace.components||[]).flatMap(c=>c.elements.flatMap(e=>e.assetId?[e.assetId]:[]))); for(const drawing of Object.values(workspace.drawings)){if(drawing.history.pastPages?.length||drawing.history.futurePages?.length)throw new Error('Expand archived history before exporting ZIP');for(const e of [...drawing.elements,...drawing.history.past.flatMap(edit=>[...edit.before,...edit.after]),...drawing.history.future.flatMap(edit=>[...edit.before,...edit.after]),...(drawing.snapshots||[]).flatMap(s=>s.elements)])if(e.assetId)assetIds.add(e.assetId);}
 for(const id of assetIds){const encoded=assets[id];if(!/^[\w-]+$/.test(id)||!encoded)throw new Error('Missing or invalid archive asset');files[assetPath(id)]=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}
 return zipSync(files,{level:6});
}
export function readWorkspaceFiles(files:Record<string,Uint8Array>):Workspace&{assetBlobs:Record<string,string>}{
 if(!files['workspace.json'])throw new Error('Folder has no workspace.json manifest');
 const manifest=JSON.parse(strFromU8(files['workspace.json']));if(manifest.archiveVersion!==1||!Array.isArray(manifest.entries))throw new Error('Unsupported workspace archive');
 const drawings:Workspace['drawings']=Object.create(null),assetBlobs:Record<string,string>=Object.create(null);
 for(const entry of manifest.entries){if(entry.kind!=='drawing')continue;if(typeof entry.id!=='string')throw new Error('Invalid archive entry');const content=files[documentPath(entry.id)];if(!content)throw new Error('Archive drawing is missing');drawings[entry.id]=JSON.parse(strFromU8(content));}
 for(const[path,bytes]of Object.entries(files)){safePath(path);if(path.startsWith('assets/')){const id=path.slice(7);if(!/^[\w-]+$/.test(id)||bytes.length>10*1024*1024)throw new Error('Invalid archive asset');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));assetBlobs[id]=btoa(binary);}}
 return {...validateWorkspace({...manifest,drawings}),assetBlobs};
}
export function readWorkspaceArchive(bytes:Uint8Array):Workspace&{assetBlobs:Record<string,string>}{
 if(bytes.length>100*1024*1024)throw new Error('ZIP exceeds 100 MB');let total=0,count=0;const names=new Set<string>();
 const files=unzipSync(bytes,{filter:file=>{safePath(file.name);if(names.has(file.name))throw new Error('Duplicate archive path');names.add(file.name);total+=file.originalSize;if(++count>10000||file.originalSize>32*1024*1024||total>256*1024*1024)throw new Error('ZIP exceeds extraction limits');return !file.name.endsWith('/');}});
 return readWorkspaceFiles(files);
}

import {createEntry,emptyDrawing,type Entry} from './index';
import {migrateNativeDocument} from '../schema/document';
import {importExcalidraw} from '../schema/excalidraw';
export function readDrawingFolder(files:Record<string,Uint8Array>):Workspace&{assetBlobs:Record<string,string>}{
 const names=Object.keys(files);for(const name of names)safePath(name);
 const manifest=names.find(name=>name==='workspace.json'||name.endsWith('/workspace.json'));
 if(manifest){const prefix=manifest.slice(0,-'workspace.json'.length);return readWorkspaceFiles(Object.fromEntries(Object.entries(files).filter(([path])=>path.startsWith(prefix)).map(([path,bytes])=>[path.slice(prefix.length),bytes])));}
 const entries:Entry[]=[],drawings:Workspace['drawings']=Object.create(null),folders=new Map<string,string>(),assetBlobs:Record<string,string>=Object.create(null),ids=new Set<string>();
 const folder=(path:string):string|null=>{if(!path)return null;const previous=folders.get(path);if(previous)return previous;const parts=path.split('/'),entry=createEntry('folder',parts.pop()!,folder(parts.join('/')));entries.push(entry);folders.set(path,entry.id);ids.add(entry.id);return entry.id;};
 for(const[path,bytes]of Object.entries(files)){
  if(/\.(json|excalidraw)$/i.test(path)){
   const input=JSON.parse(strFromU8(bytes)),parts=path.split('/'),name=parts.pop()!,entry=createEntry('drawing',name.replace(/\.(json|excalidraw)$/i,''),folder(parts.join('/')));
   const converted=input.type==='excalidraw'?importExcalidraw(input):null,native=converted?null:migrateNativeDocument(input);
   if(native?.id)entry.id=native.id;if(ids.has(entry.id))throw new Error('Folder contains duplicate drawing IDs');ids.add(entry.id);entries.push(entry);drawings[entry.id]={...emptyDrawing(),elements:converted?.elements||native!.elements,original:converted?.original||input};
   if(converted?.assetBlobs||input.assetBlobs){for(const[id,encoded]of Object.entries(converted?.assetBlobs||input.assetBlobs)){if(!/^[\w-]+$/.test(id)||typeof encoded!=='string'||encoded.length>14*1024*1024)throw new Error('Invalid folder asset');assetBlobs[id]=encoded;}}
  }else if(/\.(png|jpe?g|webp)$/i.test(path)){
   const id=path.split('/').at(-1)!.replace(/\.(png|jpe?g|webp)$/i,'');if(!/^[\w-]+$/.test(id)||bytes.length>10*1024*1024)throw new Error('Invalid folder image');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));assetBlobs[id]=btoa(binary);
  }
 }
 const currentId=entries.find(e=>e.kind==='drawing')?.id;if(!currentId)throw new Error('Folder contains no drawing documents');return{...validateWorkspace({version:1,currentId,entries,drawings}),assetBlobs};
}
