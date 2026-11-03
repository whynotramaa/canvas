import type{SceneElement}from'../schema';import{isTrashed,type Workspace,type Entry}from'./index';
export function resolveLink(workspace:Workspace,link:NonNullable<SceneElement['link']>):{entry:Entry;element?:SceneElement}{
 const entry=workspace.entries.find(e=>e.id===link.drawingId&&e.kind==='drawing');if(!entry||isTrashed(workspace,entry))throw new Error('Linked drawing is unavailable or in Trash');const element=link.elementId?workspace.drawings[entry.id]?.elements.find(e=>e.id===link.elementId):undefined;if(link.elementId&&!element)throw new Error('Linked element no longer exists');return{entry,element};
}
export function backlinks(workspace:Workspace,drawingId:string):{entry:Entry;element:SceneElement}[]{return workspace.entries.filter(e=>e.kind==='drawing'&&!isTrashed(workspace,e)).flatMap(entry=>(workspace.drawings[entry.id]?.elements||[]).filter(element=>element.link?.drawingId===drawingId).map(element=>({entry,element})));}
