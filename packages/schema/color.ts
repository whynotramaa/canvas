export function isSafePaint(value:unknown):value is string{
 if(typeof value!=='string'||value.length>100)return false;
 if(value.startsWith('#'))return[4,5,7,9].includes(value.length)&&/^#[0-9a-f]+$/i.test(value);
 return/^[a-z]{1,32}$/i.test(value)||/^(?:rgb|rgba|hsl|hsla)\([0-9.,%+\-\s/deg]+\)$/i.test(value);
}
function rgb(value:string):[number,number,number]|null{
 if(value.toLowerCase()==='black')return[0,0,0];if(value.toLowerCase()==='white')return[255,255,255];
 if(/^#[a-f0-9]{3}$/i.test(value))return[value[1]!,value[2]!,value[3]!].map(c=>parseInt(c+c,16))as[number,number,number];
 if(/^#[a-f0-9]{6}$/i.test(value))return[1,3,5].map(i=>parseInt(value.slice(i,i+2),16))as[number,number,number];return null;
}
function luminance(colour:[number,number,number]):number{return colour.reduce((sum,c,i)=>{const v=c/255;return sum+[.2126,.7152,.0722][i]!*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);},0);}
function hex(colour:number[]):string{return'#'+colour.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');}
export function displayStroke(value:string|undefined,dark=false):string{
 const colour=value||(dark?'#e8e8e8':'#292929'),channels=rgb(colour);return dark&&channels&&luminance(channels)<.3?hex(channels.map(c=>c+(255-c)*.7)):colour;
}
export function displayFill(value:string|undefined,dark=false):string|undefined{
 const channels=value?rgb(value):null;return dark&&channels&&luminance(channels)>.3?hex(channels.map((c,i)=>c*.25+[25,25,29][i]!*.75)):value;
}
export function displayBrand(value:string,dark=false):string{const channels=rgb(value);return dark&&channels&&luminance(channels)<.04?'#ececec':value;}
