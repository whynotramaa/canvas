import{expect,test}from'bun:test';
import{displayStroke,displayFill,isSafePaint}from'./color';
test('dark canvas treatment keeps neutral strokes and filled shapes legible without changing stored colours',()=>{
 expect(displayStroke('#000',true)).toBe('#b3b3b3');expect(displayStroke('#fff',true)).toBe('#fff');expect(displayStroke('#123456')).toBe('#123456');expect(displayFill('#ffffff',true)).toBe('#535356');expect(displayFill(undefined,true)).toBeUndefined();expect(isSafePaint(displayStroke('#0000ff',true))).toBe(true);
});
