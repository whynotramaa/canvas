import{expect,test}from'bun:test';
import{inlineIconToken}from'./inline';
test('inline icon triggers respect caret, whitespace and ordinary colons',()=>{
 expect(inlineIconToken('Use :redis here',10)).toEqual({start:4,end:10,query:'redis'});expect(inlineIconToken(':pg',3)?.query).toBe('pg');expect(inlineIconToken('https:',6)).toBeNull();expect(inlineIconToken('12:30',5)).toBeNull();expect(inlineIconToken('Text :',6)).toMatchObject({query:'',start:5});
});
