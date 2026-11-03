import{expect,test}from'bun:test';
import{loadIconChunk}from'./icon-library';
test('downloaded icon packs remain readable offline without relying on a service worker',async()=>{
 const fetchDescriptor=Object.getOwnPropertyDescriptor(globalThis,'fetch'),cacheDescriptor=Object.getOwnPropertyDescriptor(globalThis,'caches');const icon={id:'fixture',name:'Fixture',category:'test',aliases:[],tags:[],source:'test',license:'CC0',width:24,height:24,paths:[{d:'M0 0L24 24',color:'#000'}]};
 Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>{throw new TypeError('offline');}});Object.defineProperty(globalThis,'caches',{configurable:true,value:{async match(path:string){return path==='/icons/chunks/offline-test.json'?Response.json([icon]):undefined;}}});
 try{expect(await loadIconChunk('offline-test')).toEqual([icon]);await expect(loadIconChunk('not-downloaded')).rejects.toThrow('offline');await expect(loadIconChunk('../bad')).rejects.toThrow('Invalid');}
 finally{if(fetchDescriptor)Object.defineProperty(globalThis,'fetch',fetchDescriptor);if(cacheDescriptor)Object.defineProperty(globalThis,'caches',cacheDescriptor);else delete(globalThis as any).caches;}
});
