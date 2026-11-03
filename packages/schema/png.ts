const signature = [137,80,78,71,13,10,26,10];
const encoder = new TextEncoder(), decoder = new TextDecoder();
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(bytes: Uint8Array): number { let c = 0xffffffff; for (const byte of bytes) c = table[(c ^ byte) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunks(png: Uint8Array): { start: number; end: number; type: string; data: Uint8Array }[] {
  if (!signature.every((b,i) => png[i] === b)) throw new Error('Invalid PNG signature');
  const result = []; const view = new DataView(png.buffer, png.byteOffset, png.byteLength); let offset = 8;
  while (offset < png.length) {
    if (offset + 12 > png.length) throw new Error('Truncated PNG chunk');
    const length = view.getUint32(offset), end = offset + 12 + length;
    if (end > png.length) throw new Error('Invalid PNG chunk length');
    if (view.getUint32(end - 4) !== crc(png.subarray(offset + 4, end - 4))) throw new Error('Invalid PNG checksum');
    const type = decoder.decode(png.subarray(offset + 4, offset + 8)); result.push({ start: offset, end, type, data: png.subarray(offset + 8, end - 4) }); offset = end;
    if (type === 'IEND') { if (offset !== png.length) throw new Error('Unexpected data after PNG'); return result; }
  }
  throw new Error('PNG is missing IEND');
}
const prefix = 'canvas-scene\0\0\0\0\0';
export function embedPngScene(png: Uint8Array, document: unknown): Uint8Array {
  const parsed = chunks(png); if (parsed[0]?.type !== 'IHDR') throw new Error('PNG missing IHDR');
  const data = encoder.encode(prefix + JSON.stringify(document)); if (data.length > 100 * 1024 * 1024) throw new Error('Embedded scene exceeds 100 MB');
  const chunk = new Uint8Array(data.length + 12), view = new DataView(chunk.buffer); view.setUint32(0, data.length); chunk.set(encoder.encode('iTXt'), 4); chunk.set(data, 8); view.setUint32(chunk.length - 4, crc(chunk.subarray(4, chunk.length - 4)));
  const kept = parsed.filter(c => !(c.type === 'iTXt' && decoder.decode(c.data).startsWith(prefix)));
  const result = new Uint8Array(8 + chunk.length + kept.reduce((sum,c) => sum+c.end-c.start, 0)); result.set(signature); let offset = 8;
  for (const c of kept) { result.set(png.subarray(c.start,c.end), offset); offset += c.end-c.start; if (c.type === 'IHDR') { result.set(chunk,offset); offset += chunk.length; } }
  return result;
}
export function readPngScene(png: Uint8Array): unknown {
  for (const chunk of chunks(png)) if (chunk.type === 'iTXt' && decoder.decode(chunk.data).startsWith(prefix)) { if (chunk.data.length > 100 * 1024 * 1024) throw new Error('Embedded scene exceeds 100 MB'); return JSON.parse(decoder.decode(chunk.data).slice(prefix.length)); }
  throw new Error('PNG has no embedded Canvas scene');
}
