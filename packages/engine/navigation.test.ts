import{expect,test}from'bun:test';import{defaultSettings,snapPosition,zoomAt}from'./navigation';
test('zoom preserves the world point beneath the pointer and clamps limits',()=>{const view={x:120,y:-40,zoom:2},next=zoomAt(view,3,500,300);expect((500-next.x)/next.zoom).toBe((500-view.x)/view.zoom);expect((300-next.y)/next.zoom).toBeCloseTo((300-view.y)/view.zoom);expect(zoomAt(view,100,0,0).zoom).toBe(30);expect(zoomAt(view,.0001,0,0).zoom).toBe(.01);});
test('grid and isometric snapping use the configured lattice',()=>{expect(snapPosition(26,50,10,10,[],{...defaultSettings,gridSnap:true})).toMatchObject({x:24,y:48});const point=snapPosition(15,18,10,10,[],{...defaultSettings,backdrop:'isometric',gridSnap:true});const u=point.x/24+point.y/(24*Math.sqrt(3)),v=point.x/24-point.y/(24*Math.sqrt(3));expect(u).toBeCloseTo(Math.round(u));expect(v).toBeCloseTo(Math.round(v));});
test('smart snapping finds nearby edges and disabled snapping preserves position',()=>{const e={id:'a',type:'rectangle' as const,x:100,y:100,width:50,height:50,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};expect(snapPosition(98,98,20,20,[e],defaultSettings)).toMatchObject({x:100,y:100});expect(snapPosition(98,98,20,20,[e],{...defaultSettings,snapping:false})).toMatchObject({x:98,y:98});});
test('equal spacing snaps between neighbors and repeats existing gaps',()=>{
 const e={id:'a',type:'rectangle' as const,x:0,y:0,width:20,height:20,rotation:0,groupIds:[],frameId:null,assetId:null,startBinding:null,endBinding:null};
 const settings={...defaultSettings,snapping:true,gridSnap:false};
 expect(snapPosition(48,0,20,20,[e,{...e,id:'b',x:100}],settings,8)).toMatchObject({x:50});
 const next=snapPosition(98,0,20,20,[e,{...e,id:'b',x:50}],settings,8);expect(next.x).toBe(100);expect(next.guides.some(g=>g.kind==='spacing')).toBe(true);
 expect(snapPosition(48,0,20,20,[e,{...e,id:'b',x:100}],{...settings,snapping:false})).toMatchObject({x:48,guides:[]});
});
