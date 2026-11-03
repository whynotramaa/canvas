declare module '*.woff2' { const path:string; export default path; }

declare module '*.txt' {const path:string;export default path;}
declare module '*.wasm' {const path:string;export default path;}
declare module 'wawoff2' { export function compress(data:Uint8Array):Promise<Uint8Array>;export function decompress(data:Uint8Array):Promise<Uint8Array>; }
