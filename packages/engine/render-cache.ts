import type { Drawable } from 'roughjs/bin/core';
export class GeometryCache {
  private entries=new Map<string,{signature:string;drawable:Drawable}>();
  constructor(private limit=50000){}
  get(id:string,signature:string,build:()=>Drawable):Drawable{
    const existing=this.entries.get(id);if(existing?.signature===signature)return existing.drawable;
    const drawable=build();this.entries.delete(id);this.entries.set(id,{signature,drawable});
    if(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value!);
    return drawable;
  }
  clear():void{this.entries.clear();}
}
