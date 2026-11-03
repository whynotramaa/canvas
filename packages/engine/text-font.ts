import type{SceneElement}from'../schema';
export function fontPrimary(e:SceneElement){const family=e.fontFamily?.split(',')[0]?.replace(/[\"']/g,'').trim()||(e.type==='code'?'Space Mono':e.type==='sticky'?'Gaegu':'DM Sans');return({serif:'Source Serif 4',monospace:'Space Mono','sans-serif':'DM Sans'}as Record<string,string>)[family]||family;}
export function fontStack(e:SceneElement){return fontPrimary(e)+', DM Sans'+', Noto Sans SC, Noto Sans JP, Noto Sans KR, Noto Sans Arabic, Noto Sans Devanagari, Noto Color Emoji, sans-serif';}
export function textFont(e:SceneElement){return`${e.italic?'italic ':''}${e.bold?'700 ':''}${e.fontSize||(e.type==='code'||e.type==='table'?14:e.type==='text'?20:16)}px ${fontStack(e)}`;}
