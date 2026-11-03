const root=new URL('./',import.meta.url);
for(const kind of ['compress','decompress']){
 const source=await Bun.file(new URL(`../../node_modules/wawoff2/build/${kind}_binding.js`,root)).text();
 await Bun.write(new URL(`tools/woff2-${kind}.js.txt`,root),`let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});var Module={onRuntimeInitialized:()=>resolveReady(Module)};\n${source}\nexport default ready;\n`);
}
await Bun.write(new URL('tools/harfbuzz.js.txt',root),Bun.file(new URL('../../node_modules/harfbuzzjs/dist/harfbuzz.js',root)));
await Bun.write(new URL('tools/subset.wasm',root),Bun.file(new URL('../../node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm',root)));
const result=await Bun.build({entrypoints:[new URL('subset.worker.ts',root).pathname],target:'browser',minify:true,plugins:[{name:'font-tool-urls',setup(build){build.onResolve({filter:/^\/font-tools\//},args=>({path:args.path,external:true}));}}]});
if(!result.success)throw new Error(result.logs.map(String).join('\n'));
await Bun.write(new URL('tools/subset.worker.js.txt',root),result.outputs[0]!);
