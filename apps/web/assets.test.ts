import { expect, test } from 'bun:test';
import { portableWorkspace, restorePortableWorkspace, storeImage } from './assets';
import { createWorkspace } from '../../packages/workspace';
test('image backup restores bytes under fresh IDs without overwriting existing assets', async () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage');
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  const files = new Map<string, Blob>();
  const root = { async getFileHandle(id: string, options?: { create?: boolean }) {
    if (!options?.create && !files.has(id)) throw new Error('Missing asset');
    return { async getFile() { return files.get(id)!; }, async createWritable() { return { async write(blob: Blob) { files.set(id, blob); }, async close() {}, async abort() {} }; } };
  } };
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { async getDirectory() { return root; } } });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async () => ({ width: 100, height: 50, close() {} }) });
  try {
    await expect(storeImage(new File(['bad'], 'bad.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG');
    const asset = await storeImage(new File(['image fixture'], 'fixture.png', { type: 'image/png' }));
    const workspace = createWorkspace(); workspace.drawings[workspace.currentId]!.elements = [{ id: 'image', type: 'image', x: 0, y: 0, width: 100, height: 50, rotation: 0, groupIds: [], frameId: null, assetId: asset.id, startBinding: null, endBinding: null }];
    const backup = await portableWorkspace(workspace); const restored = await restorePortableWorkspace(backup);
    const restoredId = restored.drawings[restored.currentId]!.elements[0]!.assetId!;
    expect(restoredId).not.toBe(asset.id);
    expect(await files.get(restoredId)!.text()).toBe('image fixture');
    expect(await files.get(asset.id)!.text()).toBe('image fixture');
    expect(workspace.drawings[workspace.currentId]!.elements[0]!.assetId).toBe(asset.id);
  } finally {
    if (storageDescriptor) Object.defineProperty(navigator, 'storage', storageDescriptor); else delete (navigator as any).storage;
    if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor); else delete (globalThis as any).createImageBitmap;
  }
});
test('failed asset writes abort, clean up the new file and preserve committed assets', async () => {
 const storageDescriptor=Object.getOwnPropertyDescriptor(navigator,'storage'),bitmapDescriptor=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap');
 const files=new Map([['existing',new Blob(['committed'])]]);let aborted=false,closed=false,removed='';
 Object.defineProperty(navigator,'storage',{configurable:true,value:{async getDirectory(){return{async getFileHandle(id:string){files.set(id,new Blob());return{async createWritable(){return{async write(){throw new DOMException('Quota exceeded','QuotaExceededError');},async close(){throw new Error('must not commit');},async abort(){aborted=true;}};}};},async removeEntry(id:string){removed=id;files.delete(id);}};}}});
 Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>({width:10,height:10,close(){closed=true;}})});
 try{await expect(storeImage(new File(['new'],'new.png',{type:'image/png'}))).rejects.toThrow('Quota exceeded');expect(aborted).toBe(true);expect(closed).toBe(true);expect(removed).not.toBe('existing');expect(files.size).toBe(1);expect(await files.get('existing')!.text()).toBe('committed');}
 finally{if(storageDescriptor)Object.defineProperty(navigator,'storage',storageDescriptor);else delete(navigator as any).storage;if(bitmapDescriptor)Object.defineProperty(globalThis,'createImageBitmap',bitmapDescriptor);else delete(globalThis as any).createImageBitmap;}
});
