import { gzipSync } from 'bun';
const cwd = new URL('..', import.meta.url).pathname;
const child = Bun.spawn(['bun', 'server.js'], { cwd: cwd + '/dist', env: { ...process.env, NODE_ENV: 'production', PORT: '39317', ANTHROPIC_API_KEY: '' }, stdout: 'ignore', stderr: 'pipe' });
try {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 30; attempt++) { try { response = await fetch('http://127.0.0.1:39317/'); if (response.ok) break; } catch {} await Bun.sleep(100); }
  if (!response?.ok) throw new Error('Production server failed to start');
  const html = await response.text();
  const paths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]!).filter(p => /\.(js|css)$/.test(p));
  let bytes = gzipSync(new TextEncoder().encode(html)).length;
  const assets = new Map<string, { size: number; staticImports: string[] }>();
  for (let index = 0; index < paths.length; index++) {
    const url = new URL(paths[index]!, 'http://127.0.0.1:39317');
    if (assets.has(url.pathname)) continue;
    const response = await fetch(url); if (!response.ok) throw new Error(`Asset failed: ${url.pathname}`);
    const buffer = new Uint8Array(await response.arrayBuffer()), staticImports: string[] = [];
    assets.set(url.pathname, { size: gzipSync(buffer).length, staticImports });
    if (url.pathname.endsWith('.js')) {
      const code = new TextDecoder().decode(buffer);
      for (const match of code.matchAll(/(?:from\s*|import\s*(\(\s*)?)["'](\.\/[^"']+\.js)["']/g)) {
        const dependency = new URL(match[2]!, url).pathname;
        paths.push(dependency);
        if (!match[1]) staticImports.push(dependency);
      }
    }
  }
  const eager = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => new URL(m[1]!, 'http://127.0.0.1:39317').pathname).filter(p => /\.(js|css)$/.test(p));
  const counted = new Set<string>();
  for (let i = 0; i < eager.length; i++) { const path = eager[i]!; if (counted.has(path)) continue; counted.add(path); const asset = assets.get(path); if (!asset) throw new Error(`Missing shell asset: ${path}`); bytes += asset.size; eager.push(...asset.staticImports); }
  for (const path of ['/manifest.webmanifest', '/icon.svg', '/sw.js', '/api/config','/fonts/dm-sans-regular.woff2','/fonts/gaegu-regular.woff2','/fonts/space-mono-regular.woff2']) { const result = await fetch('http://127.0.0.1:39317' + path); if (!result.ok) throw new Error(`Route failed: ${path}`); if(path.startsWith('/fonts/')&&new TextDecoder().decode(new Uint8Array(await result.clone().arrayBuffer()).slice(0,4))!=='wOF2')throw new Error('Invalid font asset'); }
  if (bytes >= 200000) throw new Error(`Compressed shell exceeds budget: ${bytes}`);
  const icons = await fetch('http://127.0.0.1:39317/icons/catalog.json'); if (!icons.ok || (await icons.json()).length < 60) throw new Error('Icon catalogue route failed');
  const metadataResponse=await fetch('http://127.0.0.1:39317/icons/index.json');if(!metadataResponse.ok)throw new Error('Icon search index unavailable');const metadata=await metadataResponse.json() as {id:string;chunk:string}[];if(metadata.length<5000)throw new Error('Incomplete icon index');const packs=await Promise.all([...new Set(metadata.map(icon=>icon.chunk))].map(async name=>{const response=await fetch(`http://127.0.0.1:39317/icons/chunks/${name}.json`);if(!response.ok)throw new Error(`Icon pack failed: ${name}`);return[name,new Set((await response.json() as {id:string}[]).map(icon=>icon.id))] as const;}));const packIds=new Map(packs);for(const icon of metadata)if(!packIds.get(icon.chunk)?.has(icon.id))throw new Error(`Icon missing from pack: ${icon.id}`);
  console.log(JSON.stringify({ productionRoutes: 'pass', compressedShellBytes: bytes, budgetBytes: 200000, shellBudget: bytes < 200000 ? 'pass' : 'fail' }));
} finally { child.kill(); await child.exited; }
