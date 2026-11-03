import svgpath from 'svgpath';
const cache=new Map<string,string>();
export function normaliseIconPath(source:string):string{
 const cached=cache.get(source);if(cached)return cached;const path=svgpath(source);if('err'in path&&path.err)throw new Error('Invalid SVG path geometry');const segments:string[]=[];
 path.iterate(segment=>{if(segment.slice(1).some(value=>typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e7))throw new Error('Icon coordinates exceed drawing limits');segments.push(segment[0]+segment.slice(1).join(' '));});
 if(!segments.length)throw new Error('Icon path has no geometry');const normalized=segments.join(' ');cache.set(source,normalized);if(cache.size>10000)cache.delete(cache.keys().next().value!);return normalized;
}
