import{fontFiles}from'../../packages/fonts/font-assets';
import fontIndex from '../../packages/fonts/faces.json';
export function fontResponse(name:string):Response{
 if(name==='index.json')return Response.json(fontIndex,{headers:{'Cache-Control':'public, max-age=86400'}});
 const key=name.replace(/\.woff2$/,''),path=Object.hasOwn(fontFiles,key)?fontFiles[key as keyof typeof fontFiles]:undefined;if(!path)return new Response('Not found',{status:404});return new Response(Bun.file(new URL(path,import.meta.url)),{headers:{'Content-Type':'font/woff2','Cache-Control':'public, max-age=86400'}});
}
