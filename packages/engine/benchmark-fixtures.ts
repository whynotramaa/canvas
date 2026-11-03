import type { SceneElement } from '../schema';
export function benchmarkScene(count:number):SceneElement[]{
 if(!Number.isSafeInteger(count)||count<0||count>100000)throw new Error('Invalid benchmark size');
 return Array.from({length:count},(_,i)=>{
  const x=(i%200)*140,y=Math.floor(i/200)*100,type=(['rectangle','ellipse','diamond','text','arrow','pen']as const)[i%6]!;
  return{id:`benchmark-${i}`,type,x,y,width:100,height:60,rotation:i%17===0?15:0,groupIds:[],frameId:null,assetId:null,startBinding:type==='arrow'&&i>0?`benchmark-${i-1}`:null,endBinding:null,text:['text','rectangle'].includes(type)?`Node ${i} · API`:undefined,points:type==='pen'?[[x,y],[x+30,y+45],[x+70,y+15],[x+100,y+60]]:undefined,color:i%2?'#292929':'#6558d3'};
 });
}
