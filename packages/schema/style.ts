import type{SceneElement}from'./index';
import{parseDrawing}from'./validation';
export const styleKeys=['color','fill','fillStyle','strokeWidth','strokeStyle','roughness','edgeStyle','cornerRadius','clean','opacity','shadow','gradient','fontFamily','fontSize','bold','italic','underline','strike','textAlign','lineHeight','letterSpacing','verticalAlign','listStyle']as const;
export type ElementStyle=Pick<SceneElement,typeof styleKeys[number]>;
export interface NamedStyle{id:string;name:string;style:ElementStyle}
export function copyStyle(element:SceneElement):ElementStyle{return Object.fromEntries(styleKeys.map(key=>[key,element[key]]))as ElementStyle;}
export function parseStyle(value:unknown):ElementStyle{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid element style');const style=Object.fromEntries(styleKeys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,(value as Record<string,unknown>)[key]]));parseDrawing({version:1,elements:[{id:'style-validation',type:'rectangle',x:0,y:0,width:1,height:1,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,...style}]});return style;
}
export const palette=[['Ink','#292929'],['Grey','#868e96'],['Red','#e03131'],['Pink','#d6336c'],['Grape','#ae3ec9'],['Violet','#7048e8'],['Blue','#4263eb'],['Cyan','#1098ad'],['Teal','#0ca678'],['Green','#37b24d'],['Lime','#74b816'],['Amber','#f59f00']].map(([name,hex])=>({name:name!,shades:[.85,.6,.3,0,-.25].map(amount=>{const rgb=[1,3,5].map(i=>parseInt(hex!.slice(i,i+2),16));return'#'+rgb.map(c=>Math.round(amount>=0?c+(255-c)*amount:c*(1+amount)).toString(16).padStart(2,'0')).join('');})}));
