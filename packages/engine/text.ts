import{richTextLayout}from'./rich-text';
import type{SceneElement}from'../schema';
export interface TextLine{text:string;x:number;y:number}
export function layoutText(text:string,width:number,fontSize:number,lineHeight:number,measure:(text:string)=>number):TextLine[]{
 const lines:TextLine[]=[];let y=0;
 for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/(\s+)/)){if(line&&measure(line+word)>width){lines.push({text:line.trimEnd(),x:0,y});y+=fontSize*lineHeight;line='';}if(!line&&!word.trim())continue;if(measure(word)>width){for(const char of Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word),segment=>segment.segment)){if(line&&measure(line+char)>width){lines.push({text:line,x:0,y});y+=fontSize*lineHeight;line='';}line+=char;}}else line+=word;}lines.push({text:line.trimEnd(),x:0,y});y+=fontSize*lineHeight;}
 return lines;
}
export{fontPrimary,fontStack,textFont}from'./text-font';
import{textFont}from'./text-font';
export function safeEmbedUrl(input:string):string{const url=new URL(input);if(url.protocol!=='https:')throw new Error('Embeds require HTTPS');if(url.username||url.password)throw new Error('Embed credentials are not allowed');const host=url.hostname.replace(/^www\./,'');if(host==='youtube.com'&&url.searchParams.get('v'))return`https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.searchParams.get('v')!)}`;if(host==='youtu.be')return`https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.pathname.slice(1))}`;if(host==='figma.com'&&!url.pathname.startsWith('/embed'))return`https://www.figma.com/embed?embed_host=canvas&url=${encodeURIComponent(url.href)}`;if(host==='gist.github.com'&&!url.pathname.endsWith('.pibb'))return`https://gist.github.com${url.pathname.replace(/\/$/,'')}.pibb`;return url.href;}

export function growTextContainer(element:SceneElement,measure:(text:string,font:string)=>number):SceneElement{
 if(!element.text||['arrow','line','pen','icon','table','image','frame'].includes(element.type))return element;
 const padding=element.type==='text'?0:12,size=element.fontSize||(element.type==='code'?14:element.type==='text'?20:16),lineHeight=element.lineHeight||1.4;
 const lines=richTextLayout(element,(text,style)=>measure(text,textFont(style)));
 const required=lines.length*size*lineHeight+padding*2;
 if(required<=Math.abs(element.height))return element;
 return{...element,height:Math.sign(element.height||1)*required};
}
