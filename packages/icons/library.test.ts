import{expect,test}from'bun:test';
import{importElementLibrary,exportElementLibrary}from'./library';
import{cloneSelection}from'../engine/selection';
test('Excalidraw libraries import editable groups, preserve originals and round trip native content',()=>{
 const source={type:'excalidrawlib',version:2,libraryItems:[{name:'API pair',elements:[{id:'a',type:'rectangle',x:0,y:0,width:100,height:60},{id:'b',type:'rectangle',x:200,y:0,width:100,height:60},{id:'edge',type:'arrow',x:100,y:30,width:100,height:0,startBinding:{elementId:'a'},endBinding:{elementId:'b'}}]}]};
 const {items}=importElementLibrary(source);expect(items[0]?.name).toBe('API pair');expect(items[0]?.original).toEqual(source.libraryItems[0]);const elements=items[0]!.elements,copies=cloneSelection(elements,elements.map(e=>e.id));expect(copies[2]!.startBinding).toBe(copies[0]!.id);expect(importElementLibrary(exportElementLibrary(items)).items[0]?.elements).toEqual(elements);
 expect(()=>importElementLibrary({type:'excalidrawlib',version:99,libraryItems:[]})).toThrow();expect(importElementLibrary({type:'excalidrawlib',version:1,library:[source.libraryItems[0]!.elements]}).items).toHaveLength(1);
});
