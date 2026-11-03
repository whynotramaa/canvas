import{fontToolResponse}from'../server/font-tools';
import {fontResponse}from'../server/fonts';
import {catalogFile,indexFile,chunks} from '../../packages/icons/assets';
import index from './index.html';
import { icon, manifest, serviceWorker } from './offline';

const port = Number(process.env.PORT) || 3000;
Bun.serve({
  port,
  hostname: process.env.HOST || '127.0.0.1',
  routes: {
    '/font-tools/:name':request=>fontToolResponse(request.params.name),
    '/fonts/:name': request => fontResponse(request.params.name),
    '/icons/catalog.json': () => new Response(Bun.file(catalogFile), { headers: { 'Content-Type':'application/json','Cache-Control': 'public, max-age=86400' } }),
    '/icons/index.json': () => new Response(Bun.file(indexFile), {headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=86400'}}),
    '/icons/chunks/:name': request => {const name=request.params.name.replace(/\.json$/,'');const path=Object.hasOwn(chunks,name)?chunks[name]:undefined;return path?new Response(Bun.file(path),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=86400'}}):new Response('Icon pack not found',{status:404});},
    '/api/config': () => Response.json({ collab: process.env.COLLAB_URL || null }),
    '/': index,
    '/embed': index,
    '/manifest.webmanifest': () => Response.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } }),
    '/icon.svg': () => new Response(icon, { headers: { 'Content-Type': 'image/svg+xml' } }),
    '/sw.js': () => new Response(serviceWorker, { headers: { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' } }),
  },
  development: process.env.NODE_ENV !== 'production',
});
console.log(`Canvas running on http://localhost:${port}`);
