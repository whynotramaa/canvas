import {growTextContainer} from './text';
import{expect,test}from'bun:test';import{layoutText,safeEmbedUrl}from'./text';import{parseDrawing}from'../schema/validation';import{exportSvg}from'../schema/svg';
test('wrapping preserves explicit newlines, long words and Unicode content',()=>{const lines=layoutText('Hello world\n日本語',5,10,1.5,text=>Array.from(text).length);expect(lines.map(line=>line.text)).toEqual(['Hello','world','日本語']);expect(lines[2]!.y).toBe(30);expect(layoutText('abcdefgh',3,10,1,text=>text.length).map(line=>line.text)).toEqual(['abc','def','gh']);});
test('embeds reject scripts, credentials and insecure protocols',()=>{for(const input of ['javascript:alert(1)','http://example.com','https://user:password@example.com'])expect(()=>safeEmbedUrl(input)).toThrow();expect(safeEmbedUrl('https://example.com')).toBe('https://example.com/');});
test('table validation and SVG preserve cells as escaped text',()=>{const e={id:'table',type:'table' as const,x:0,y:0,width:200,height:100,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,cells:[['<script>','日本語'],['cell','value']]};parseDrawing({version:1,elements:[e]});expect(exportSvg([e])).toContain('&lt;script&gt;');expect(exportSvg([e])).toContain('日本語');expect(()=>parseDrawing({version:1,elements:[{...e,cells:[['one'],['two','three']]}]})).toThrow('table');});

test('text container growth uses shared wrapping metrics and never shrinks existing geometry',()=>{
 const e={id:'text',type:'rectangle' as const,text:'one two three four',x:0,y:0,width:64,height:24,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
 const grown=growTextContainer(e,text=>text.length*8);expect(grown.height).toBeGreaterThan(e.height);expect(grown.width).toBe(e.width);expect(growTextContainer(grown,text=>text.length*8)).toBe(grown);
 expect(growTextContainer({...e,height:-24},text=>text.length*8).height).toBeLessThan(-24);
});
