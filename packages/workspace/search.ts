import type { Entry, Workspace } from './index';
import type { SceneElement } from '../schema';
export interface SearchResult { entry:Entry;elementId?:string;excerpt:string;score:number }
interface SearchDocument { entry:Entry;path:string;hidden:boolean;elements:SceneElement[];text:{id:string;text:string}[] }
function fuzzyScore(text:string,word:string):number{
 const direct=text.indexOf(word);if(direct>=0)return 100-word.length*.01-direct*.001;
 let cursor=0,first=-1,last=-1;for(const char of word){const position=text.indexOf(char,cursor);if(position<0)return -1;if(first<0)first=position;last=position;cursor=position+1;}
 return 40-(last-first-word.length+1)*.1-first*.001;
}
function match(text:string,words:string[]):number{let score=0;const lower=text.toLocaleLowerCase();for(const word of words){const found=fuzzyScore(lower,word);if(found<0)return-1;score+=found;}return score;}
export class WorkspaceSearchIndex {
 private documents=new Map<string,SearchDocument>();
 sync(workspace:Workspace):number{
  const entries=new Map(workspace.entries.map(e=>[e.id,e])),paths=new Map<string,{path:string;hidden:boolean}>(),visiting=new Set<string>();let reindexed=0;
  const resolve=(entry:Entry):{path:string;hidden:boolean}=>{const cached=paths.get(entry.id);if(cached)return cached;if(visiting.has(entry.id))throw new Error('Folder cycle');visiting.add(entry.id);const parent=entry.parentId?entries.get(entry.parentId):undefined,ancestor=parent?resolve(parent):undefined;const result={path:[ancestor?.path,entry.title].filter(Boolean).join(' / '),hidden:entry.deleted!==null||!!ancestor?.hidden};visiting.delete(entry.id);paths.set(entry.id,result);return result;};
  const remaining=new Set<string>();
  for(const entry of workspace.entries){if(entry.kind!=='drawing')continue;remaining.add(entry.id);const {path,hidden}=resolve(entry),elements=workspace.drawings[entry.id]?.elements||[],previous=this.documents.get(entry.id);
   const text=previous?.elements===elements?previous.text:elements.map(e=>({id:e.id,text:[e.text,e.cells?.map(row=>row.join(' ')).join('\n'),e.url,e.notes].filter(Boolean).join('\n')})).filter(e=>e.text);
   if(previous?.elements!==elements)reindexed++;
   this.documents.set(entry.id,{entry,path:[path,...entry.tags].join(' / '),hidden,elements,text});
  }
  for(const id of this.documents.keys())if(!remaining.has(id))this.documents.delete(id);
  return reindexed;
 }
 search(query:string):SearchResult[]{
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),results:SearchResult[]=[];
  for(const doc of this.documents.values()){
   if(doc.hidden)continue;const pathScore=match(doc.path,words);if(pathScore>=0)results.push({entry:doc.entry,excerpt:doc.path,score:pathScore+10});
   if(words.length)for(const element of doc.text){const score=match(`${doc.path} ${element.text}`,words);if(score>=0&&(pathScore<0||match(element.text,words)>=0))results.push({entry:doc.entry,elementId:element.id,excerpt:element.text,score});}
  }
  return results.sort((a,b)=>b.score-a.score||b.entry.modified-a.entry.modified||a.entry.id.localeCompare(b.entry.id));
 }
}
const indexes=new WeakMap<Workspace,WorkspaceSearchIndex>();
export function searchWorkspace(workspace:Workspace,query:string):SearchResult[]{let index=indexes.get(workspace);if(!index){index=new WorkspaceSearchIndex();index.sync(workspace);indexes.set(workspace,index);}return index.search(query);}
