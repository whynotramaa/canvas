import {defaultSettings,type CanvasSettings}from'../../packages/engine/navigation';
export function drawBackdrop(ctx:CanvasRenderingContext2D,width:number,height:number,view:{x:number;y:number;zoom:number},dark:boolean,settings:CanvasSettings=defaultSettings){
 const kind=settings.backdrop;ctx.save();ctx.fillStyle=kind==='blueprint'?'#16416a':kind==='chalkboard'?'#243d32':kind==='kraft'?(dark?'#40362b':'#d7bc8e'):kind==='warm'?(dark?'#302c27':'#fbf4e8'):dark?'#181816':'#fdfcf9';ctx.fillRect(0,0,width,height);
 ctx.globalAlpha=settings.opacity;ctx.strokeStyle=ctx.fillStyle=kind==='blueprint'||kind==='chalkboard'?'#ffffff':dark?'#dedee8':'#555563';ctx.lineWidth=1;
 let step=settings.gridSize*view.zoom;while(step<12)step*=5;while(step>200)step/=5;
 const ox=((view.x%step)+step)%step,oy=((view.y%step)+step)%step;
 if(['dots','lines','graph','isometric','notebook','blueprint'].includes(kind)){
  ctx.beginPath();
  if(kind==='dots'){for(let x=ox;x<width;x+=step)for(let y=oy;y<height;y+=step){ctx.moveTo(x+1,y);ctx.arc(x,y,Math.min(1.5,view.zoom),0,Math.PI*2);}ctx.fill();}
  else{for(let y=oy;y<height;y+=step){ctx.moveTo(0,y);ctx.lineTo(width,y);}if(kind!=='notebook'&&kind!=='isometric')for(let x=ox;x<width;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,height);}if(kind==='isometric'){const slope=Math.sqrt(3);for(let x=-height/slope-step+ox;x<width+height/slope;x+=step){ctx.moveTo(x,0);ctx.lineTo(x+height/slope,height);ctx.moveTo(x,0);ctx.lineTo(x-height/slope,height);}}ctx.stroke();}
  if(kind==='graph'&&view.zoom>.2){ctx.globalAlpha=Math.min(1,settings.opacity*2);ctx.beginPath();const major=step*5;for(let x=((view.x%major)+major)%major;x<width;x+=major){ctx.moveTo(x,0);ctx.lineTo(x,height);}for(let y=((view.y%major)+major)%major;y<height;y+=major){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();}
 }
 if(['kraft','warm','grain','chalkboard'].includes(kind)){for(let i=0;i<1800;i++){const x=(i*7919)%Math.ceil(width),y=(i*3571)%Math.ceil(height);ctx.fillRect(x,y,1,1);}}
 if(kind==='vignette'){ctx.globalAlpha=settings.opacity;const gradient=ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,Math.max(width,height)*.7);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,dark?'#000000':'#77777e');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);}
 ctx.restore();
}
