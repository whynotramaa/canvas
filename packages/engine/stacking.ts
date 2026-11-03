import type {SceneElement} from '../schema';
export type StackMove='forward'|'backward'|'front'|'back';
export function reorderElements(elements:SceneElement[],selected:Set<string>,move:StackMove):SceneElement[]{
 const ids=new Set(elements.filter(e=>selected.has(e.id)&&!e.locked).map(e=>e.id));if(!ids.size)return elements;
 if(move==='front'||move==='back'){const chosen=elements.filter(e=>ids.has(e.id)),rest=elements.filter(e=>!ids.has(e.id));return move==='front'?[...rest,...chosen]:[...chosen,...rest];}
 const next=elements.slice();if(move==='forward'){for(let i=next.length-2;i>=0;i--)if(ids.has(next[i]!.id)&&!ids.has(next[i+1]!.id))[next[i],next[i+1]]=[next[i+1]!,next[i]!];}
 else for(let i=1;i<next.length;i++)if(ids.has(next[i]!.id)&&!ids.has(next[i-1]!.id))[next[i],next[i-1]]=[next[i-1]!,next[i]!];
 return next;
}
