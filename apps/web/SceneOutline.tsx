import { useMemo, useState } from 'react';
import type { SceneElement } from '../../packages/schema';
import { outlinePage } from '../../packages/engine/outline';
export function SceneOutline({elements, selected, select, close}: {elements:SceneElement[];selected:string|null;select:(id:string)=>void;close:()=>void}) {
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);
 const result=useMemo(()=>outlinePage(elements,query,page),[elements,query,page]);
 return <aside id="scene-outline" className="scene-outline" aria-label="Scene outline"><div className="workspace-heading"><h2>Scene outline</h2><button onClick={close} aria-label="Close scene outline">×</button></div><label>Find an element<input autoFocus type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><p role="status">{result.total} elements · page {result.current+1} of {result.pages}</p><ol>{result.items.map(({element,index,description})=><li key={element.id} value={index+1}><button aria-current={selected===element.id?'true':undefined} onClick={()=>select(element.id)}>{description}</button></li>)}</ol><div className="code-actions"><button disabled={!result.current} onClick={()=>setPage(result.current-1)}>Previous</button><button disabled={result.current+1===result.pages} onClick={()=>setPage(result.current+1)}>Next</button></div></aside>;
}
