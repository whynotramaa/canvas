import{expect,test}from'bun:test';
import{containElements,fitContainers}from'./containers';
import{moveWithBindings}from'./transforms';
import{benchmarkScene}from'./benchmark-fixtures';
test('containers adopt enclosed content and move nested children with them',()=>{
 const base=benchmarkScene(1)[0]!,frame={...base,id:'frame',type:'frame' as const,x:-50,y:-50,width:300,height:250},child={...base,id:'child',x:0,y:0,rotation:0},outside={...base,id:'outside',x:500};const contained=containElements([frame,child,outside],'frame');expect(contained[1]?.frameId).toBe('frame');expect(contained[2]?.frameId).toBeNull();const moved=moveWithBindings(contained,new Set(['frame']),100,20);expect(moved[1]).toMatchObject({x:100,y:20});expect(moved[2]).toBe(outside);
});
test('automatic sizing works inside out, ignores badges and rejects cycles without modifying inputs',()=>{
 const base={...benchmarkScene(1)[0]!,rotation:0},outer={...base,id:'outer',type:'frame' as const,autoSize:true},inner={...base,id:'inner',type:'rectangle' as const,container:true,autoSize:true,frameId:'outer'},child={...base,id:'child',x:200,y:100,frameId:'inner'},badge={...base,id:'badge',badge:true,x:9999,frameId:'outer'};const elements=[outer,inner,child,badge],fitted=fitContainers(elements);expect(fitted[1]).toMatchObject({x:176,y:52,width:148,height:132});expect(fitted[0]!.width).toBeLessThan(500);expect(fitContainers(fitted)).toBe(fitted);expect(elements[0]!.x).toBe(0);expect(()=>fitContainers([{...outer,frameId:'inner'},inner])).toThrow('cycle');
});
import{elementOutline,hitTest}from'./geometry';
test('rotated auto containers retain their rotation and enclose content without size drift',()=>{const base={...benchmarkScene(1)[0]!,rotation:0},frame={...base,id:'frame',type:'frame' as const,autoSize:true,rotation:45},child={...base,id:'child',frameId:'frame',x:200,y:100};const fitted=fitContainers([frame,child]);expect(fitted[0]!.rotation).toBe(45);expect(elementOutline(child).every(outline=>outline.points.every(([x,y])=>hitTest(fitted[0]!,x,y,0)))).toBe(true);expect(fitContainers(fitted)).toBe(fitted);});
test('auto sizing handles a large flat container without recursive or argument-stack limits',()=>{const nodes=benchmarkScene(10000).map(e=>({...e,type:'rectangle' as const,frameId:'frame'})),frame={...nodes[0]!,id:'frame',type:'frame' as const,frameId:null,autoSize:true};const fitted=fitContainers([frame,...nodes]);expect(fitted).toHaveLength(10001);expect(fitted[0]!.width).toBeGreaterThan(20000);});
