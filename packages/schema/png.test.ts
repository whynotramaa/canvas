import { expect, test } from 'bun:test';
import { embedPngScene, readPngScene } from './png';
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'));
test('PNG embeds Unicode scene metadata and rejects damaged chunks', () => {
  // Build a valid minimal container so metadata tests do not depend on a decoder.
  const container = new Uint8Array([...png.slice(0,33), ...png.slice(-12)]);
  const document = { version: 1, elements: [], title: 'हिन्दी · 日本語' };
  const encoded = embedPngScene(container, document); expect(readPngScene(encoded)).toEqual(document);
  expect(readPngScene(embedPngScene(encoded, { ...document, title: 'updated' }))).toMatchObject({ title: 'updated' });
  encoded[encoded.length - 1] ^= 1;
  expect(() => readPngScene(encoded)).toThrow('checksum');
  expect(() => readPngScene(container.slice(0,20))).toThrow();
});
