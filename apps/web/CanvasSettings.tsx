import { useEffect } from 'react';
import { X } from 'lucide-react';
import { backdrops,type CanvasSettings as Settings } from '../../packages/engine/navigation';
import { loadFontText } from '../../packages/fonts';
export const handFonts=['Excalifont','Virgil','Caveat','Kalam','Patrick Hand','Architects Daughter','Gochi Hand','Gaegu'];
const papers={light:['#fdfcf9','#ffffff','#f5f1e8','#eef3f9','#eef5ee','#fbf0ee','#f4f0fa','#fdf6e3'],dark:['#181816','#0f0f10','#161b22','#1a1f2b','#16201b','#231a1c','#1e1a26','#262019']};
const patterns:Record<string,string>={plain:'Plain',dots:'Dots',lines:'Lines',graph:'Graph',isometric:'Isometric',notebook:'Notebook',blueprint:'Blueprint',chalkboard:'Chalk',kraft:'Kraft',warm:'Warm',grain:'Grain',vignette:'Vignette'};
const sample='Hello there';
function Toggle({label,hint,checked,set}:{label:string;hint?:string;checked:boolean;set:(value:boolean)=>void}){return <label className="setting-toggle"><span>{label}{hint&&<small>{hint}</small>}</span><input type="checkbox" role="switch" checked={checked} onChange={e=>set(e.target.checked)}/></label>;}
export function CanvasSettings({settings,change,theme,setTheme,handFont,setHandFont,close}:{settings:Settings;change:(value:Settings)=>void;theme:string;setTheme:(value:string)=>void;handFont:string;setHandFont:(value:string)=>void;close:()=>void}){
 useEffect(()=>{for(const family of handFonts)void loadFontText(family,sample).catch(()=>{});},[]);
 const dark=theme==='dark',swatches=dark?papers.dark:papers.light,current=settings.background&&swatches.includes(settings.background)?settings.background:swatches[0];
 return <section className="settings-panel" aria-label="Canvas settings">
  <div className="settings-head"><strong>Settings</strong><button className="close" aria-label="Close canvas settings" onClick={close}><X size={16}/></button></div>
  <div className="settings-body">
   <section><h3>Theme</h3><div className="segmented wide">{[['light','Light'],['dark','Dark'],['contrast','Contrast']].map(([id,label])=><button key={id} aria-pressed={theme===id} onClick={()=>setTheme(id!)}>{label}</button>)}</div></section>
   <section><h3>Background<small>This canvas only</small></h3><div className="paper-swatches">{swatches.map(color=><button key={color} className="paper" style={{background:color}} aria-pressed={current===color} aria-label={`Background ${color}`} title={color} onClick={()=>change({...settings,background:color===swatches[0]?undefined:color})}/>)}</div></section>
   <section><h3>Pattern</h3><div className="pattern-grid">{backdrops.map(b=><button key={b} className={'pattern pattern-'+b} aria-pressed={settings.backdrop===b} onClick={()=>change({...settings,backdrop:b})}><i aria-hidden="true"/><span>{patterns[b]}</span></button>)}</div>
    {settings.backdrop!=='plain'&&<div className="setting-sliders"><label><span>Grid size<output>{settings.gridSize}px</output></span><input type="range" min="8" max="96" step="4" value={settings.gridSize} onChange={e=>change({...settings,gridSize:e.target.valueAsNumber})}/></label><label><span>Strength<output>{Math.round(settings.opacity*100)}%</output></span><input type="range" min="0.05" max="1" step=".05" value={settings.opacity} onChange={e=>change({...settings,opacity:e.target.valueAsNumber})}/></label></div>}
   </section>
   <section><h3>Handwriting<small>Used for new text</small></h3><div className="font-grid">{handFonts.map(family=><button key={family} aria-pressed={handFont===family} onClick={()=>setHandFont(family)}><b style={{fontFamily:`"${family}", cursive`}}>{sample}</b><span>{family}</span></button>)}</div></section>
   <section><h3>Drawing</h3>
    <Toggle label="Clean lines" hint="Straight strokes instead of sketchy" checked={!!settings.clean} set={value=>change({...settings,clean:value})}/>
    <Toggle label="Smart snapping" hint="Hold Ctrl or Cmd to bypass" checked={settings.snapping} set={value=>change({...settings,snapping:value})}/>
    <Toggle label="Snap to grid" checked={settings.gridSnap} set={value=>change({...settings,gridSnap:value})}/>
   </section>
  </div>
 </section>;
}
