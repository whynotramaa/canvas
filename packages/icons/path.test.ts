import{expect,test}from'bun:test';
import rough from'roughjs';
import{normaliseIconPath}from'./path';
test('compact arc flags normalize without changing command coordinates or breaking roughjs',()=>{
 const source='M10 10a2.343 2.343 0 11-.002 4.686z',path=normaliseIconPath(source);expect(path).toContain('a2.343 2.343 0 1 1 -0.002 4.686');expect(()=>rough.generator().path(path)).not.toThrow();expect(normaliseIconPath(source)).toBe(path);expect(()=>normaliseIconPath('M0 0L')).toThrow();expect(()=>normaliseIconPath('M1e300 0L1 1')).toThrow();
});
