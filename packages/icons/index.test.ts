import { expect,test } from 'bun:test';
import catalog from './catalog.json';
import { validateArtwork, type IconArtwork } from './types';
import { parseDrawing } from '../schema/validation';
import { exportSvg } from '../schema/svg';
import { exportExcalidraw, importExcalidraw } from '../schema/excalidraw';
test('complete sourced icon catalogue remains editable across saves and interchange', () => {
  expect(catalog.length).toBeGreaterThan(5000); expect(new Set(catalog.map(i=>i.id)).size).toBe(catalog.length);
  for(const artwork of catalog) { const icon=validateArtwork(artwork); const e={id:icon.id,type:'icon' as const,icon,iconMode:'handdrawn' as const,x:10,y:20,width:88,height:88,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null}; expect(parseDrawing(JSON.parse(JSON.stringify({version:1,elements:[e]})))).toEqual([e]); expect(exportSvg([e])).toContain('<path'); expect(importExcalidraw(exportExcalidraw([e])).elements).toEqual([e]); }
  for(const name of ['aws','azure','react','nextdotjs','load-balancer','queue','aws-sqs','azure-service-bus']) expect(catalog.some(i=>i.id===name)).toBe(true);
});
test('uploaded paths cannot introduce external references or markup',()=>{
 const base=catalog[0] as IconArtwork;
 for(const d of ['<script>alert(1)</script>','M0 0 url(https://example.com)','javascript:alert(1)']) expect(()=>validateArtwork({...base,paths:[{d,color:'#000000'}]})).toThrow();
 expect(()=>validateArtwork({...base,paths:[{d:'M0 0L1 1',color:'url(https://example.com)'}]})).toThrow();
 expect(()=>validateArtwork({...base,guidance:{invalid:true}})).toThrow();
});
