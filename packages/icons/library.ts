import type {SceneElement} from '../schema';
import {importExcalidraw,exportExcalidraw} from '../schema/excalidraw';
import {parseDrawing} from '../schema/validation';
export interface LibraryItem{id:string;name:string;elements:SceneElement[];original?:unknown}
export function validateLibraryItem(value:unknown):LibraryItem{const item=value as LibraryItem;if(!item||typeof item.id!=='string'||!item.id||typeof item.name!=='string'||!item.name)throw new Error('Invalid library item');parseDrawing({version:1,elements:item.elements});return item;}
export function importElementLibrary(input:unknown):{items:LibraryItem[];notices:string[]}{
 const doc=input as {type?:string;version?:number;libraryItems?:{id?:string;name?:string;elements:unknown;canvasNative?:unknown}[];library?:unknown[][]};
 if(!doc||doc.type!=='excalidrawlib'||![1,2].includes(doc.version||0))throw new Error('Unsupported element library');
 const source=doc.version===1?doc.library?.map(elements=>({elements})):doc.libraryItems;if(!Array.isArray(source)||source.length>500)throw new Error('Invalid library collection');
 const notices=new Set<string>(),items=source.map((raw,index)=>{const item=raw as {id?:string;name?:string;elements:unknown;canvasNative?:unknown},converted=importExcalidraw({type:'excalidraw',elements:item.elements,canvasNative:item.canvasNative});for(const notice of converted.notices)notices.add(notice);if(converted.elements.some(e=>e.assetId))throw new Error('Library images need embedded assets; import the source drawing instead');return validateLibraryItem({id:crypto.randomUUID(),name:item.name||`Library item ${index+1}`,elements:converted.elements,original:raw});});return{items,notices:[...notices]};
}
export function exportElementLibrary(items:LibraryItem[]):object{
 return{type:'excalidrawlib',version:2,source:'Canvas',libraryItems:items.map(item=>{validateLibraryItem(item);const external=exportExcalidraw(item.elements)as{elements:unknown;canvasNative:unknown};return{id:item.id,name:item.name,status:'unpublished',created:Date.now(),elements:external.elements,canvasNative:external.canvasNative};})};
}
