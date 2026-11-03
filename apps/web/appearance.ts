export interface Appearance{dark:boolean;contrast:boolean}
export function parseAppearance(value:unknown,fallback=false):Appearance{const data=value as Partial<Appearance>|null;return{dark:typeof data?.dark==='boolean'?data.dark:fallback,contrast:typeof data?.contrast==='boolean'?data.contrast:false};}
export function readAppearance():Appearance{try{return parseAppearance(JSON.parse(localStorage.getItem('canvas-appearance')||'null'),matchMedia('(prefers-color-scheme: dark)').matches);}catch{return{dark:false,contrast:false};}}
