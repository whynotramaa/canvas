import worker from '../../packages/fonts/tools/subset.worker.js.txt' with{type:'file'};
import harfbuzz from '../../packages/fonts/tools/harfbuzz.js.txt' with{type:'file'};
import compress from '../../packages/fonts/tools/woff2-compress.js.txt' with{type:'file'};
import decompress from '../../packages/fonts/tools/woff2-decompress.js.txt' with{type:'file'};
import subset from '../../packages/fonts/tools/subset.wasm' with{type:'file'};
const files:Record<string,string>={'subset.worker.js':worker,'harfbuzz.js':harfbuzz,'woff2-compress.js':compress,'woff2-decompress.js':decompress,'subset.wasm':subset};
export function fontToolResponse(name:string):Response{const path=Object.hasOwn(files,name)?files[name]:undefined;return path?new Response(Bun.file(new URL(path,import.meta.url)),{headers:{'Content-Type':name.endsWith('.wasm')?'application/wasm':'text/javascript','Cache-Control':'public, max-age=86400'}}):new Response('Not found',{status:404});}
