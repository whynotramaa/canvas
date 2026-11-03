import {expect,test}from'bun:test';
import {GeometryCache}from'./render-cache';
import rough from'roughjs';
test('geometry cache reuses stable geometry and invalidates changed styles',()=>{
 const cache=new GeometryCache(1),generator=rough.generator();let calls=0;const build=()=>{calls++;return generator.rectangle(0,0,20,20);};
 const first=cache.get('a','black',build);expect(cache.get('a','black',build)).toBe(first);expect(calls).toBe(1);
 expect(cache.get('a','red',build)).not.toBe(first);expect(calls).toBe(2);cache.get('b','black',build);cache.get('a','red',build);expect(calls).toBe(4);
});
