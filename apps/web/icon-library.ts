import {validateArtwork,type IconArtwork,type IconMetadata} from '../../packages/icons/types';
export async function fetchIconResource(path:string):Promise<Response>{try{return await fetch(path);}catch(error){const cached=typeof caches==='undefined'?undefined:await caches.match(path);if(cached)return cached;throw error;}}
const chunks=new Map<string,Promise<IconArtwork[]>>();
export function loadIconChunk(name:string):Promise<IconArtwork[]>{
 if(!/^[a-z0-9-]+$/.test(name))return Promise.reject(new Error('Invalid icon chunk'));
 let pending=chunks.get(name);if(!pending){pending=fetchIconResource(`/icons/chunks/${name}.json`).then(async r=>{if(!r.ok)throw new Error('This icon pack is unavailable offline. Download it while connected.');const data=await r.json();if(!Array.isArray(data))throw new Error('Invalid icon pack');return data.map(validateArtwork);}).catch(error=>{chunks.delete(name);throw error;});chunks.set(name,pending);}return pending;
}
export async function loadIcon(icon:IconMetadata|IconArtwork):Promise<IconArtwork>{if('paths'in icon)return icon;const found=(await loadIconChunk(icon.chunk)).find(item=>item.id===icon.id);if(!found)throw new Error('Icon not found in pack');return found;}
