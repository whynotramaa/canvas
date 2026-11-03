import type{SceneElement}from'../schema';
import{textFont}from'./text-font';
export interface TextSpan{text:string;bold?:boolean;italic?:boolean;strike?:boolean;code?:boolean;href?:string}
export function safeTextUrl(value:string):string{const url=new URL(value);if(!['https:','http:','mailto:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP, HTTPS or mailto link');return url.href;}
export function inlineMarkdown(text:string,format:Omit<TextSpan,'text'>={},depth=0):TextSpan[]{
 if(depth>8||text.length>200000)return[{...format,text}];const result:TextSpan[]=[],tokens=/(\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|\[([^\[\]]+)\]\(([^\s()]+)\))/g;let cursor=0;
 for(const match of text.matchAll(tokens)){if(match.index!>cursor)result.push({...format,text:text.slice(cursor,match.index)});if(match[2])result.push(...inlineMarkdown(match[2],{...format,bold:true},depth+1));else if(match[3])result.push(...inlineMarkdown(match[3],{...format,strike:true},depth+1));else if(match[4])result.push({...format,text:match[4],code:true});else if(match[5])result.push(...inlineMarkdown(match[5],{...format,italic:true},depth+1));else{try{result.push(...inlineMarkdown(match[6]!,{...format,href:safeTextUrl(match[7]!)},depth+1));}catch{result.push({...format,text:match[0]});}}cursor=match.index!+match[0].length;}
 if(cursor<text.length)result.push({...format,text:text.slice(cursor)});return result.length?result:[{...format,text}];
}
export function textParagraphs(e:SceneElement):TextSpan[][]{
 const content=e.type==='embed'?e.url||'HTTPS embed':e.text||'';return content.split('\n').map((paragraph,i)=>{let prefix='';if(e.listStyle==='bullet'||(!e.listStyle&&/^\s*[-*]\s+/.test(paragraph))){prefix='• ';paragraph=paragraph.replace(/^\s*[-*]\s+/,'');}else if(e.listStyle==='number'){prefix=`${i+1}. `;paragraph=paragraph.replace(/^\s*\d+\.\s+/,'');}return[...(prefix?[{text:prefix}]:[]),...(['code','embed'].includes(e.type)?[{text:paragraph}]:inlineMarkdown(paragraph))];});
}
export interface PositionedSpan extends TextSpan{x:number;width:number;font:string;element:SceneElement}
export interface RichLine{runs:PositionedSpan[];y:number;width:number;text:string}
export function richTextLayout(e:SceneElement,measure:(text:string,element:SceneElement)=>number):RichLine[]{
 const size=e.fontSize||(e.type==='code'?14:e.type==='text'?20:16),padding=e.type==='text'?0:12,width=Math.max(1,Math.abs(e.width)-padding*2),spacing=e.letterSpacing||0,rows:{runs:PositionedSpan[];width:number}[]=[];
 for(const paragraph of textParagraphs(e)){let row={runs:[]as PositionedSpan[],width:0};const flush=()=>{rows.push(row);row={runs:[],width:0};};
  for(const span of paragraph){const style={...e,bold:e.bold||span.bold,italic:e.italic||span.italic,fontFamily:span.code?'Space Mono':e.fontFamily},font=textFont(style),spanWidth=(text:string)=>measure(text,style)+Math.max(0,Array.from(text).length-1)*spacing;
   for(const token of span.text.split(/(\s+)/)){if(!token)continue;if(row.width&&row.width+spanWidth(token)>width)flush();if(!row.width&&!token.trim())continue;const pieces=spanWidth(token)>width?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(token),s=>s.segment):[token];for(const text of pieces){const w=spanWidth(text);if(row.width&&row.width+w>width)flush();const previous=row.runs.at(-1);if(previous&&previous.font===font&&previous.href===span.href&&previous.code===span.code&&previous.strike===span.strike){previous.text+=text;previous.width=spanWidth(previous.text);row.width=previous.x+previous.width;}else{row.runs.push({...span,text,x:row.width,width:w,font,element:style});row.width+=w;}}}
  }flush();
 }
 const height=rows.length*size*(e.lineHeight||1.4),vertical=e.verticalAlign||(['text','sticky','code','embed'].includes(e.type)?'top':'middle'),top=e.type==='icon'?e.y+e.height+6:vertical==='top'?e.y+padding:vertical==='bottom'?e.y+Math.abs(e.height)-padding-height:e.y+(Math.abs(e.height)-height)/2;
 return rows.map((row,i)=>{const align=e.textAlign||(['text','sticky','code'].includes(e.type)?'left':'center'),left=e.x+padding+(align==='center'?(width-row.width)/2:align==='right'?width-row.width:0);return{runs:row.runs.map(run=>({...run,x:left+run.x})),y:top+i*size*(e.lineHeight||1.4),width:row.width,text:row.runs.map(run=>run.text).join('')};});
}

export function fontTexts(element:SceneElement):{text:string;element:SceneElement}[]{if(element.type==='table')return(element.cells||[]).flatMap(row=>row.map(text=>({text,element})));return textParagraphs(element).flatMap(paragraph=>paragraph.map(span=>({text:span.text,element:{...element,bold:element.bold||span.bold,italic:element.italic||span.italic,fontFamily:span.code?'Space Mono':element.fontFamily}})));}
import{rotatePoint,type Point}from'./geometry';
export function textLinkAt(element:SceneElement,point:Point,measure:(text:string,element:SceneElement)=>number):string|undefined{if(element.textLink)return safeTextUrl(element.textLink);const local=rotatePoint(point,{x:element.x+element.width/2,y:element.y+element.height/2},-element.rotation),size=element.fontSize||(element.type==='text'?20:16);for(const line of richTextLayout(element,measure))for(const run of line.runs)if(run.href&&local.x>=run.x&&local.x<=run.x+run.width&&local.y>=line.y&&local.y<=line.y+size)return run.href;}
