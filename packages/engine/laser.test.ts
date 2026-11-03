import{expect,test}from'bun:test';import{laserTrail}from'./laser';
test('laser trails expire, stay bounded and leave source samples untouched',()=>{const source=Array.from({length:250},(_,i)=>({x:i,y:0,time:1000}));expect(laserTrail(source,1200,{x:999,y:1})).toHaveLength(200);expect(laserTrail(source,2100)).toEqual([]);expect(source).toHaveLength(250);});
