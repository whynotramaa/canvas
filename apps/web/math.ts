import { mathSvg } from '../../packages/schema/math';
const images = new Map<string, HTMLImageElement>();
export function mathImage(latex: string, color: string, width: number, height: number, size: number, ready: () => void): HTMLImageElement | undefined {
  const key = JSON.stringify([latex, color, Math.round(width), Math.round(height), size]), cached = images.get(key);
  if (cached) return cached.complete && cached.naturalWidth ? cached : undefined;
  if (images.size > 300) images.clear();
  const image = new Image(); image.onload = ready; image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mathSvg(latex, color, width, height, size)); images.set(key, image);
  return undefined;
}
let listener = () => {};
export function onMathReady(callback: () => void) { listener = callback; }
export function notifyMath() { listener(); }
