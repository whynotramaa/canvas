import{defaultSettings,type CanvasSettings}from'../../packages/engine/navigation';
const grounds:Record<string,[string,string]>={blueprint:['#f1f5fa','#141c26'],chalkboard:['#f1f4f1','#161d1a'],kraft:['#f6efe2','#221f1b'],warm:['#fbf8f2','#1c1a17']};
const inks:Record<string,[string,string]>={blueprint:['#2f6db5','#8fb6e8'],chalkboard:['#4d6b5b','#a8c4b4']};
export function drawBackdrop(ctx:CanvasRenderingContext2D,width:number,height:number,view:{x:number;y:number;zoom:number},dark:boolean,settings:CanvasSettings=defaultSettings){
 const kind=settings.backdrop,mode=dark?1:0,custom=settings.background&&isDark(settings.background)===dark?settings.background:undefined;ctx.save();
 ctx.fillStyle=custom||grounds[kind]?.[mode]||(dark?'#181816':'#fdfcf9');ctx.fillRect(0,0,width,height);
 const strength=Math.min(1,settings.opacity)*.45;ctx.globalAlpha=strength;ctx.strokeStyle=ctx.fillStyle=inks[kind]?.[mode]||(dark?'#d6d4cc':'#6b6a64');ctx.lineWidth=.75;
 let step=settings.gridSize*view.zoom;while(step<12)step*=5;while(step>200)step/=5;
 const ox=((view.x%step)+step)%step,oy=((view.y%step)+step)%step;
 if(['dots','lines','graph','isometric','notebook','blueprint','chalkboard'].includes(kind)){
  ctx.beginPath();
  if(kind==='dots'){ctx.globalAlpha=Math.min(1,strength*3.2);const r=Math.min(1.2,.8+view.zoom*.3);for(let x=ox;x<width;x+=step)for(let y=oy;y<height;y+=step){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}ctx.fill();}
  else{for(let y=oy;y<height;y+=step){ctx.moveTo(0,y);ctx.lineTo(width,y);}if(kind!=='notebook'&&kind!=='isometric')for(let x=ox;x<width;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,height);}if(kind==='isometric'){const slope=Math.sqrt(3);for(let x=-height/slope-step+ox;x<width+height/slope;x+=step){ctx.moveTo(x,0);ctx.lineTo(x+height/slope,height);ctx.moveTo(x,0);ctx.lineTo(x-height/slope,height);}}ctx.stroke();}
  if((kind==='graph'||kind==='blueprint')&&view.zoom>.2){ctx.globalAlpha=Math.min(1,strength*1.6);ctx.beginPath();const major=step*5;for(let x=((view.x%major)+major)%major;x<width;x+=major){ctx.moveTo(x,0);ctx.lineTo(x,height);}for(let y=((view.y%major)+major)%major;y<height;y+=major){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();}
 }
 if(['kraft','warm','grain'].includes(kind)){ctx.globalAlpha=strength*.6;for(let i=0;i<1200;i++){const x=(i*7919)%Math.ceil(width),y=(i*3571)%Math.ceil(height);ctx.fillRect(x,y,1,1);}}
 if(kind==='vignette'){ctx.globalAlpha=strength;const gradient=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.35,width/2,height/2,Math.max(width,height)*.75);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,dark?'#000000':'#8a8880');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);}
 ctx.restore();
}
export function isDark(hex:string):boolean{const n=parseInt(hex.slice(1),16);return((n>>16&255)*299+(n>>8&255)*587+(n&255)*114)/1000<128;}
