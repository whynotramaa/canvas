export interface IconToken{start:number;end:number;query:string}
export function inlineIconToken(text:string,caret:number):IconToken|null{
 const prefix=text.slice(0,caret),match=/(?:^|\s):([\p{L}\p{N}_-]*)$/u.exec(prefix);if(!match)return null;return{start:caret-match[1]!.length-1,end:caret,query:match[1]!};
}
