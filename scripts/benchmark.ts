import {cpus,platform,release,totalmem} from 'node:os';
import {benchmarkScene} from '../packages/engine/benchmark-fixtures';
import {SceneStore} from '../packages/engine';
import {SpatialIndex} from '../packages/engine/spatial';
import {hitTest} from '../packages/engine/geometry';
import {record} from '../packages/engine/history';
const results=[];
for(const size of [5000,10000,50000]){
 const elements=benchmarkScene(size),started=performance.now(),store=new SceneStore({version:1,id:`benchmark-${size}`,elements}),open=performance.now()-started,index=new SpatialIndex();
 let start=performance.now();index.update(store.getSnapshot().elements);const indexBuild=performance.now()-start;
 const samples:number[]=[];for(let i=0;i<40;i++){const before=store.getSnapshot().elements,shape=before[0]!,next=[{...shape,x:shape.x+1},...before.slice(1)];start=performance.now();store.setElements(next);index.update(store.getSnapshot().elements);const candidates=index.search({minX:0,minY:0,maxX:1400,maxY:900});candidates.find(e=>hitTest(e,50,30));record({past:[],future:[]},before,store.getSnapshot().elements);samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);results.push({size,openMs:open,indexBuildMs:indexBuild,editIndexHitHistoryMedianMs:samples[Math.floor(samples.length/2)],editIndexHitHistoryP95Ms:samples[Math.floor(samples.length*.95)]});store.destroy();
}
const report={recordedAt:new Date().toISOString(),host:{os:`${platform()} ${release()}`,cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryGiB:totalmem()/2**30,runtime:`Bun ${Bun.version}`},method:'Deterministic equal mix of rectangles, ellipses, diamonds, labels, bound arrows and four-sample pens. Cold Yjs scene creation and R-tree construction. Forty warm single-element edits including scene transaction, index maintenance, viewport query, hit test and delta-history comparison; performance.now wall clock. No canvas rasterization or browser event loop measured.',browser:null,displayScale:null,cache:'cold scene/index; warm edits',results};
await Bun.write(new URL('../docs/benchmark-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
