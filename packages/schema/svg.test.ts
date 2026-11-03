import { expect, test } from 'bun:test';
import { exportSvg } from './svg';
test('SVG escapes untrusted text and embeds the recoverable document', () => {
  const svg = exportSvg([{ id: 'a', type: 'text', x: 0, y: 0, width: 10, height: 10, rotation: 0, groupIds: [], frameId: null, assetId: null, startBinding: null, endBinding: null, text: '<script>alert(1)</script>' } as any]);
  expect(svg).not.toContain('<script>');
  expect(svg).toContain('&lt;script&gt;');
  expect(svg).toContain('canvas-scene');
});
test('SVG includes raster bytes, pressure outlines, arrowheads and only selected scene data',()=>{
 const base={id:'base',type:'rectangle' as const,x:0,y:0,width:100,height:60,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
 const image={...base,id:'image',type:'image' as const,assetId:'asset'},pen={...base,id:'pen',type:'pen' as const,points:[[0,0],[20,30],[100,60]] as[number,number][],pressures:[.1,.9,.3]},arrow={...base,id:'arrow',type:'arrow' as const,endArrowhead:'diamond' as const};
 const svg=exportSvg([image,pen,arrow],{assetBlobs:{asset:'iVBORw0KGgo='},selection:['image','pen','arrow'],scale:2});expect(svg).toContain('data:image/png;base64,iVBORw0KGgo=');expect(svg).toContain('<polygon');expect(svg).toContain('<path');expect(svg).toContain('&quot;pressures&quot;:[0.1,0.9,0.3]');
 const selected=exportSvg([image,pen,arrow],{selection:['pen']});expect(selected).not.toContain('&quot;assetId&quot;:&quot;asset&quot;');expect(()=>exportSvg([image])).toThrow('unavailable');expect(()=>exportSvg([image],{assetBlobs:{asset:'https://evil.invalid/a'}})).toThrow();expect(()=>exportSvg([pen],{background:'url(https://evil.invalid)'})).toThrow();
});
test('SVG preserves stroke patterns, gradients, shadows, rounding and deterministic sketch paths',()=>{
 const e={id:'styled',type:'rectangle' as const,x:0,y:0,width:120,height:80,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null,strokeStyle:'dashed' as const,fill:'#f8df86',fillStyle:'cross-hatch' as const,roughness:2,edgeStyle:'round' as const,gradient:{start:'#ffffff',end:'#6558d3'},shadow:true};const svg=exportSvg([e]);expect(svg).toContain('linearGradient');expect(svg).toContain('stroke-dasharray="8 6"');expect(svg).toContain('feDropShadow');expect(svg).toContain('stroke-linejoin="round"');expect(svg).toBe(exportSvg([e]));expect(exportSvg([e],{clean:true})).not.toBe(svg);
});
