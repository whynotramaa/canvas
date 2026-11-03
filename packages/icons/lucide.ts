export function lucidePath(tag:string,attrs:Record<string,string>):string{
 const n=(key:string,fallback=0)=>{const value=attrs[key]===undefined?fallback:Number(attrs[key]);if(!Number.isFinite(value))throw new Error('Invalid Lucide geometry');return value;};
 if(tag==='path')return attrs.d!;
 if(tag==='line')return`M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
 if(tag==='polyline'||tag==='polygon')return`M${attrs.points}${tag==='polygon'?'Z':''}`;
 if(tag==='circle'||tag==='ellipse'){const cx=n('cx'),cy=n('cy'),rx=n(tag==='circle'?'r':'rx'),ry=n(tag==='circle'?'r':'ry');return`M${cx-rx} ${cy}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0`;}
 if(tag==='rect'){const x=n('x'),y=n('y'),w=n('width'),h=n('height'),r=Math.min(n('rx'),w/2,h/2);return r?`M${x+r} ${y}h${w-2*r}a${r} ${r} 0 0 1 ${r} ${r}v${h-2*r}a${r} ${r} 0 0 1 ${-r} ${r}h${-w+2*r}a${r} ${r} 0 0 1 ${-r} ${-r}v${-h+2*r}a${r} ${r} 0 0 1 ${r} ${-r}Z`:`M${x} ${y}h${w}v${h}h${-w}Z`;}
 throw new Error(`Unsupported Lucide shape ${tag}`);
}
