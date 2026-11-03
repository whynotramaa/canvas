import {prepareHistory,validatePage} from './history-pages';
import type {Edit} from '../../packages/engine/history';
import { createWorkspace, emptyDrawing, expireTrash, validateWorkspace, type Workspace } from '../../packages/workspace';
import { migrateNativeDocument } from '../../packages/schema/document';
import { parseDrawing } from '../../packages/schema/validation';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('canvas-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('scenes');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Canvas tabs to open storage'));
  });
}
export async function loadWorkspace(): Promise<Workspace> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scenes'), store = tx.objectStore('scenes');
    const current = store.get('workspace'), legacy = store.get('current');
    tx.oncomplete = () => { db.close(); try {
      if (current.result) { resolve(expireTrash(validateWorkspace(current.result))); return; }
      const old = legacy.result; const drawing = Array.isArray(old) ? { ...emptyDrawing(), elements: migrateNativeDocument(old).elements } : old || emptyDrawing();
      resolve(validateWorkspace(createWorkspace(drawing)));
    } catch (error) { reject(error); } };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
export async function saveWorkspace(workspace: Workspace): Promise<Workspace> {
  validateWorkspace(workspace);
  const prepared=await prepareHistory(workspace);
  const db = await database();
  return new Promise((resolve, reject) => {
    let tx:IDBTransaction|undefined;
    try {
      tx=db.transaction('scenes','readwrite');
      tx.oncomplete=()=>{db.close();resolve(prepared.workspace);};tx.onerror=tx.onabort=()=>{db.close();reject(tx?.error||new Error('Save transaction was interrupted'));};
      // shortcut: unreferenced pages remain for concurrent tabs; add coordinated collection when storage pressure requires reclamation.
      const store=tx.objectStore('scenes');for(const[id,page]of prepared.pages)store.put(page,`history:${id}`);store.put(prepared.workspace,'workspace');
    }catch(error){try{tx?.abort();}catch{}db.close();reject(error);}
  });
}
export async function rawRecovery():Promise<Record<string,unknown>>{
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('scenes'),store=tx.objectStore('scenes'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve({canvasRecovery:1,records:Object.fromEntries(keys.result.map((key,index)=>[String(key),values.result[index]]))});};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};});
}

export async function readHistoryPage(id:string):Promise<Edit[]>{
 if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid history page ID');const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('scenes'),request=tx.objectStore('scenes').get(`history:${id}`);tx.oncomplete=()=>{db.close();try{resolve(validatePage(request.result));}catch(error){reject(error);}};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};});
}
