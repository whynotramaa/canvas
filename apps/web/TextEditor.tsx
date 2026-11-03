import{useLayoutEffect,useRef}from'react';
import type{SceneElement}from'../../packages/schema';
import{textFont}from'../../packages/engine/text';
import{inlineIconToken,type IconToken}from'../../packages/icons/inline';
import{displayStroke}from'../../packages/schema/color';
const measurer=document.createElement('canvas').getContext('2d');
export function TextEditor({element:e,view,dark,update,close,findIcon}:{element:SceneElement;view:{x:number;y:number;zoom:number};dark:boolean;update:(element:SceneElement)=>void;close:()=>void;findIcon:(element:SceneElement,token:IconToken)=>void}){
 const ref=useRef<HTMLTextAreaElement>(null),free=e.type==='text';
 const size=e.fontSize||(e.type==='code'?14:free?20:16),lineHeight=e.lineHeight||1.4,padding=free?0:12,z=view.zoom;
 const vertical=e.verticalAlign||(['text','sticky','code'].includes(e.type)?'top':'middle'),align=e.textAlign||(['text','sticky','code'].includes(e.type)?'left':'center');
 const width=free?Math.max(Math.abs(e.width),size):Math.max(1,Math.abs(e.width)-padding*2);
 useLayoutEffect(()=>{const field=ref.current;if(!field)return;field.style.height='0';const h=field.scrollHeight;field.style.height=h+'px';const box=Math.abs(e.height),top=vertical==='top'?e.y+padding:vertical==='bottom'?e.y+box-padding-h/z:e.y+(box-h/z)/2;field.style.top=top*z+view.y+'px';});
 useLayoutEffect(()=>{const timer=setTimeout(()=>{const field=ref.current;if(!field)return;field.focus();field.setSelectionRange(field.value.length,field.value.length);});return()=>clearTimeout(timer);},[]);
 const change=(text:string)=>{let next={...e,text};if(free&&measurer){measurer.font=textFont(e);const lines=text.split('\n');next={...next,width:Math.max(...lines.map(line=>measurer.measureText(line).width))+2,height:lines.length*size*lineHeight};}update(next);return next;};
 return <textarea ref={ref} className="text-editor" aria-label="Text" spellCheck={e.type!=='code'} wrap={free?'off':'soft'} value={e.text||''}
  style={{left:(e.x+padding)*z+view.x,width:(width+(free?size:0))*z,font:textFont({...e,fontSize:size*z}),lineHeight:lineHeight,textAlign:align,color:displayStroke(e.color,dark),letterSpacing:(e.letterSpacing||0)*z}}
  onChange={event=>{const next=change(event.target.value),caret=event.target.selectionStart,token=inlineIconToken(event.target.value,caret);if(!(event.nativeEvent as InputEvent).isComposing&&token&&event.target.value[caret-1]===':')findIcon(next,token);}}
  onBlur={close}/>;
}
