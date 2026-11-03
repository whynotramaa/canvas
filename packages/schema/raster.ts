export function rasterDataUrl(encoded:string):string{
 if(typeof encoded!=='string'||encoded.length>14*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Error('Invalid embedded raster image');
 const header=atob(encoded.slice(0,Math.min(32,encoded.length)));
 const mime=header.startsWith('\x89PNG\r\n\x1a\n')?'image/png':header.startsWith('\xff\xd8\xff')?'image/jpeg':header.startsWith('RIFF')&&header.slice(8,12)==='WEBP'?'image/webp':null;
 if(!mime)throw new Error('Unsupported embedded raster image');return`data:${mime};base64,${encoded}`;
}
export function readRasterDataUrl(input:unknown):string{
 if(typeof input!=='string')throw new Error('Missing image data');const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input);if(!match||rasterDataUrl(match[2]!).split(';')[0]!==`data:${match[1]}`)throw new Error('Invalid raster data URL');return match[2]!;
}
