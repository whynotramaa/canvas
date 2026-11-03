import{expect,test}from'bun:test';
import{draw}from'./renderer';
import{benchmarkScene}from'../../packages/engine/benchmark-fixtures';
test('canvas rendering applies validated patterns, gradients, rounding and shadows without mutating the scene',()=>{
 const pathDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Path2D');Object.defineProperty(globalThis,'Path2D',{configurable:true,value:class{constructor(readonly path:string){}}});let gradients=0,fills=0;const dashes:number[][]=[],stops:string[]=[],shadows:number[]=[];
 const canvas={width:400,height:300,getContext:()=>context};const context=new Proxy({canvas,measureText:(text:string)=>({width:text.length*8}),setLineDash:(dash:number[])=>dashes.push(dash),fill:()=>{fills++;},createLinearGradient:()=>{gradients++;return{addColorStop:(_:number,colour:string)=>stops.push(colour)};}},{get(target,key){return key in target?(target as any)[key]:()=>{};},set(target,key,value){if(key==='shadowBlur')shadows.push(value);(target as any)[key]=value;return true;}});
 try{const e={...benchmarkScene(1)[0]!,text:undefined,fill:'#f8df86',fillStyle:'hachure' as const,strokeStyle:'dashed' as const,roughness:2,edgeStyle:'round' as const,gradient:{start:'#ffffff',end:'#6558d3'},shadow:true},before=JSON.stringify(e);draw(context as any,[e],{x:0,y:0,zoom:1},null,false,[],true);expect(gradients).toBe(1);expect(stops).toEqual(['#ffffff','#6558d3']);expect(fills).toBeGreaterThan(0);expect(dashes).toContainEqual([8,6]);expect(shadows).toContain(12);expect(JSON.stringify(e)).toBe(before);}
 finally{if(pathDescriptor)Object.defineProperty(globalThis,'Path2D',pathDescriptor);else delete(globalThis as any).Path2D;}
});
