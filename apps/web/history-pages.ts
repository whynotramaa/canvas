import {validateEdit,type Edit,type History} from '../../packages/engine/history';
import type {Workspace} from '../../packages/workspace';
export const HISTORY_PAGE_SIZE=256,HISTORY_HOT_LIMIT=512;
export async function compactHistory(history:History):Promise<{history:History;pages:Map<string,Edit[]>}>{
 const pages=new Map<string,Edit[]>(),result={...history};
 for(const side of ['past','future']as const){const count=Math.floor(Math.max(0,history[side].length-HISTORY_HOT_LIMIT)/HISTORY_PAGE_SIZE)*HISTORY_PAGE_SIZE;if(!count)continue;const refs=[...(history[side==='past'?'pastPages':'futurePages']||[])];
  for(let start=0;start<count;start+=HISTORY_PAGE_SIZE){const edits=history[side].slice(start,start+HISTORY_PAGE_SIZE),bytes=new TextEncoder().encode(JSON.stringify(edits)),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),id=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');pages.set(id,edits);refs.push(id);}
  result[side]=history[side].slice(count);result[side==='past'?'pastPages':'futurePages']=refs;
 }
 return{history:result,pages};
}
export async function prepareHistory(workspace:Workspace):Promise<{workspace:Workspace;pages:Map<string,Edit[]>}>{
 const drawings={...workspace.drawings},pages=new Map<string,Edit[]>();for(const[id,drawing]of Object.entries(drawings)){const compacted=await compactHistory(drawing.history);drawings[id]={...drawing,history:compacted.history};for(const[key,value]of compacted.pages)pages.set(key,value);}return{workspace:{...workspace,drawings},pages};
}
export function validatePage(value:unknown):Edit[]{if(!Array.isArray(value)||!value.length||value.length>HISTORY_PAGE_SIZE)throw new Error('History page is missing or corrupt');return value.map(validateEdit);}
export async function materializeHistory(workspace:Workspace,read:(id:string)=>Promise<Edit[]>):Promise<Workspace>{
 const drawings={...workspace.drawings};for(const[id,drawing]of Object.entries(drawings)){const history={...drawing.history};for(const side of ['past','future']as const){const key=side==='past'?'pastPages':'futurePages',edits:Edit[]=[];for(const page of history[key]||[])edits.push(...validatePage(await read(page)));history[side]=[...edits,...history[side]];delete history[key];}drawings[id]={...drawing,history};}return{...workspace,drawings};
}
export async function takeHistoryEdit(source:History,reverse:boolean,read:(id:string)=>Promise<Edit[]>):Promise<{history:History;edit?:Edit}>{
 const history:History={...source,past:[...source.past],future:[...source.future],pastPages:[...(source.pastPages||[])],futurePages:[...(source.futurePages||[])]},side=reverse?'past':'future',pages=reverse?'pastPages':'futurePages';
 if(!history[side].length&&history[pages]!.length){const id=history[pages]!.at(-1)!;history[side]=validatePage(await read(id));history[pages]!.pop();}
 const edit=history[side].pop();if(edit)history[reverse?'future':'past'].push(edit);return{history,edit};
}
