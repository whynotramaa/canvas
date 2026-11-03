import{expect,test}from'bun:test';
import{drawingThumbnail}from'./thumbnail';
import{defaultSettings}from'../../packages/engine/navigation';
import{benchmarkScene}from'../../packages/engine/benchmark-fixtures';
test('thumbnails keep the scene immutable and bound detailed rendering for dense drawings',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');let fills=0,encoded=false;
 const canvas={width:0,height:0,getContext:()=>context,toDataURL(type:string){encoded=type==='image/webp';return'data:image/webp;base64,fixture';}};
 const context=new Proxy({canvas,measureText:(text:string)=>({width:text.length*8}),fillRect:()=>{fills++;}},{get(target,key){return key in target?(target as any)[key]:()=>{};},set(target,key,value){(target as any)[key]=value;return true;}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
 try{const scene=benchmarkScene(1000).map(e=>({...e,type:'rectangle' as const,text:undefined})),before=JSON.stringify(scene);expect(drawingThumbnail(scene,false,defaultSettings)).toStartWith('data:image/webp');expect(encoded).toBe(true);expect(fills).toBeGreaterThan(400);expect(JSON.stringify(scene)).toBe(before);expect(canvas.width).toBe(240);expect(canvas.height).toBe(160);}
 finally{if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else delete(globalThis as any).document;}
});
