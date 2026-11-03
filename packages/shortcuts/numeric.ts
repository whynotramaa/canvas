import type{SceneElement}from'../schema';
import{refreshBindings}from'../engine/connectors';
export type GeometryFields=Partial<Pick<SceneElement,'x'|'y'|'width'|'height'|'rotation'>>;
export function parseNumericCommand(input:string):GeometryFields{
 const fields:GeometryFields={},names={w:'width',h:'height',r:'rotation',x:'x',y:'y'}as const;let end=0,found=false;
 for(const match of input.matchAll(/([whrxy])\s*(-?(?:\d+(?:\.\d*)?|\.\d+))/gi)){if(input.slice(end,match.index).trim())throw new Error('Use w, h, r, x or y followed by a number');const value=Number(match[2]),key=names[match[1]!.toLowerCase()as keyof typeof names];if(!Number.isFinite(value)||((key==='width'||key==='height')&&value<=0))throw new Error('Dimensions must be positive and all values finite');fields[key]=value;end=match.index!+match[0].length;found=true;}
 if(!found||input.slice(end).trim())throw new Error('Use commands such as w 240, r 45, or x 100 y 200');return fields;
}
export function applyGeometryFields(elements:SceneElement[],ids:Set<string>,fields:GeometryFields):SceneElement[]{return refreshBindings(elements,elements.map(e=>{if(!ids.has(e.id)||e.locked)return e;const x=fields.x??e.x,y=fields.y??e.y,width=fields.width??e.width,height=fields.height??e.height,sx=e.width?width/e.width:1,sy=e.height?height/e.height:1;return{...e,...fields,points:e.points?.map(([px,py])=>[x+(px-e.x)*sx,y+(py-e.y)*sy]as[number,number])};}));}
