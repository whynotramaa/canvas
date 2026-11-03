import{expect,test}from'bun:test';
import{reorderElements}from'./stacking';
import{benchmarkScene}from'./benchmark-fixtures';
test('layer moves preserve selection order and move blocks by one unselected neighbor',()=>{
 const elements=benchmarkScene(5),ids=new Set(elements.slice(1,3).map(e=>e.id)),order=(items:typeof elements)=>items.map(e=>e.id.split('-').at(-1));
 expect(order(reorderElements(elements,ids,'forward'))).toEqual(['0','3','1','2','4']);expect(order(reorderElements(elements,ids,'backward'))).toEqual(['1','2','0','3','4']);expect(order(reorderElements(elements,ids,'front'))).toEqual(['0','3','4','1','2']);expect(order(reorderElements(elements,ids,'back'))).toEqual(['1','2','0','3','4']);expect(reorderElements(elements,new Set(),'front')).toBe(elements);
 const locked=[{...elements[0]!,locked:true},...elements.slice(1)];expect(reorderElements(locked,new Set([locked[0]!.id]),'front')).toBe(locked);
});
