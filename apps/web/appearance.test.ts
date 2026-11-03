import{expect,test}from'bun:test';
import{parseAppearance}from'./appearance';
test('appearance preferences validate stored values and retain system fallback',()=>{expect(parseAppearance({dark:true,contrast:true})).toEqual({dark:true,contrast:true});expect(parseAppearance({dark:'false',contrast:1},true)).toEqual({dark:true,contrast:false});expect(parseAppearance(null)).toEqual({dark:false,contrast:false});});
