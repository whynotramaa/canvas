import{expect,test}from'bun:test';
import{copyStyle,parseStyle,palette}from'./style';
import{benchmarkScene}from'../engine/benchmark-fixtures';
test('style copy excludes geometry and rejects active paints or invalid rendering options',()=>{
 const element={...benchmarkScene(1)[0]!,color:'#4263eb',fillStyle:'hachure' as const,roughness:.5,gradient:{start:'#fff',end:'#000'}};const copied=copyStyle(element);expect(copied.color).toBe(element.color);expect('x'in copied).toBe(false);expect(parseStyle({...copied,x:999})).not.toHaveProperty('x');expect(()=>parseStyle({gradient:{start:'url(https://evil.invalid)',end:'#fff'}})).toThrow();expect(()=>parseStyle({roughness:Infinity})).toThrow();expect(palette).toHaveLength(12);expect(palette.every(colour=>colour.shades.length===5)).toBe(true);
});
