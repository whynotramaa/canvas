import{expect,test}from'bun:test';import{drawLayers}from'./layers';import type{SceneElement}from'../../packages/schema';
test('static bitmap is reused during selection changes and invalidated by view, scale and font revision',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');let builds=0,composites=0;
 function makeCanvas(count=false){let width=400;const canvas={get width(){return width;},set width(value:number){width=value;if(count)builds++;},height:300,getContext:()=>context};const context=new Proxy({canvas,measureText:(text:string)=>({width:text.length*8}),drawImage:()=>{composites++;}},{get(target,key){return key in target?(target as any)[key]:()=>{};},set(target,key,value){(target as any)[key]=value;return true;}});return{canvas,context};}
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>makeCanvas(true).canvas}});
 try{const {context}=makeCanvas(),elements:SceneElement[]=[{id:'a',type:'rectangle',x:10,y:10,width:100,height:100,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null}],view={x:0,y:0,zoom:1};const render=(selected:string[],ratio=1,revision=0)=>drawLayers(context as any,elements,elements,new Set(),view,selected,false,400,300,ratio,revision);render([]);expect(builds).toBe(1);render(['a']);expect(builds).toBe(1);render(['a'],2);expect(builds).toBe(2);render([],2,1);expect(builds).toBe(3);expect(composites).toBe(4);}
 finally{if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else delete(globalThis as any).document;}
});
