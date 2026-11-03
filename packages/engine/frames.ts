import type{SceneElement}from'../schema';
export function frameContext(byId:Map<string,SceneElement>,element:SceneElement):{hidden:boolean;clips:SceneElement[]}{
 const seen=new Set([element.id]),clips:SceneElement[]=[];let child=element,parent=element.frameId?byId.get(element.frameId):undefined;
 while(parent&&!seen.has(parent.id)){seen.add(parent.id);if(parent.hidden)return{hidden:true,clips};if(parent.type==='frame'&&parent.clip!==false&&!child.badge)clips.push(parent);child=parent;parent=parent.frameId?byId.get(parent.frameId):undefined;}return{hidden:false,clips};
}
