import type { SceneElement } from '../schema';
import { shapeNames } from '../schema/shapes';
export { shapeNames } from '../schema/shapes';
export function shapePath(e: Pick<SceneElement, 'x' | 'y' | 'width' | 'height' | 'type'>&Partial<Pick<SceneElement,'cornerRadius'|'edgeStyle'>>): string | null {
  const x = Math.min(e.x, e.x + e.width), y = Math.min(e.y, e.y + e.height), w = Math.abs(e.width), h = Math.abs(e.height);
  if(['rectangle','frame','sticky','table','code','embed'].includes(e.type)&&(e.cornerRadius||e.edgeStyle==='round')){const r=Math.min(w/2,h/2,e.cornerRadius??16);return `M${x+r} ${y}h${w-2*r}a${r} ${r} 0 0 1 ${r} ${r}v${h-2*r}a${r} ${r} 0 0 1 ${-r} ${r}h${-w+2*r}a${r} ${r} 0 0 1 ${-r} ${-r}v${-h+2*r}a${r} ${r} 0 0 1 ${r} ${-r}Z`;}
  const point = (a: number, b: number) => `${x + a * w} ${y + b * h}`;
  const polygon = (points: number[][]) => `M${points.map(([a,b]) => point(a!,b!)).join('L')}Z`;
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${point(cx-rx,cy)}A${w*rx} ${h*ry} 0 1 0 ${point(cx+rx,cy)}A${w*rx} ${h*ry} 0 1 0 ${point(cx-rx,cy)}Z`;
  const rounded = (r: number) => { const rr = Math.min(w, h) * r; return `M${x+rr} ${y}h${w-2*rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}v${h-2*rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}h${-w+2*rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}v${-h+2*rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}Z`; };
  switch (e.type) {
    case 'triangle': return polygon([[.5,0],[1,1],[0,1]]);
    case 'hexagon': return polygon([[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]]);
    case 'parallelogram': return polygon([[.2,0],[1,0],[.8,1],[0,1]]);
    case 'trapezoid': return polygon([[.2,0],[.8,0],[1,1],[0,1]]);
    case 'star': return polygon(Array.from({ length: 10 }, (_,i) => { const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .22 : .5; return [.5 + Math.cos(angle) * r, .5 + Math.sin(angle) * r]; }));
    case 'cylinder': return `M${point(0,.15)}C${point(0,-.05)} ${point(1,-.05)} ${point(1,.15)}L${point(1,.85)}C${point(1,1.05)} ${point(0,1.05)} ${point(0,.85)}ZM${point(0,.15)}C${point(0,.35)} ${point(1,.35)} ${point(1,.15)}`;
    case 'cloud': return `M${point(.2,.85)}C${point(-.1,.85)} ${point(-.05,.4)} ${point(.15,.4)}C${point(.05,.05)} ${point(.45,-.05)} ${point(.55,.2)}C${point(.75,-.05)} ${point(1.05,.2)} ${point(.9,.45)}C${point(1.15,.55)} ${point(1,.95)} ${point(.75,.85)}Z`;
    case 'document': return `M${point(0,0)}L${point(1,0)}L${point(1,.85)}C${point(.65,.65)} ${point(.35,1.15)} ${point(0,.9)}Z`;
    case 'multi-document': return `M${point(.1,0)}L${point(1,0)}L${point(1,.8)}M${point(.05,.07)}L${point(.95,.07)}L${point(.95,.87)}M${point(0,.14)}L${point(.9,.14)}L${point(.9,.85)}C${point(.6,.7)} ${point(.3,1.15)} ${point(0,.9)}Z`;
    case 'stored-data': return `M${point(.2,0)}L${point(1,0)}C${point(.7,.2)} ${point(.7,.8)} ${point(1,1)}L${point(.2,1)}C${point(-.05,.8)} ${point(-.05,.2)} ${point(.2,0)}Z`;
    case 'callout': case 'speech-bubble': return polygon([[0,0],[1,0],[1,.75],[.45,.75],[.2,1],[.25,.75],[0,.75]]);
    case 'brace': return `M${point(.8,0)}Q${point(.5,0)} ${point(.5,.25)}Q${point(.5,.5)} ${point(.2,.5)}Q${point(.5,.5)} ${point(.5,.75)}Q${point(.5,1)} ${point(.8,1)}`;
    case 'cube': return polygon([[0,.2],[.6,0],[1,.2],[1,.8],[.4,1],[0,.8]]) + `M${point(0,.2)}L${point(.4,.4)}L${point(1,.2)}M${point(.4,.4)}L${point(.4,1)}`;
    case 'person': return `M${point(.65,.18)}A${w * .15} ${h * .15} 0 1 1 ${point(.35,.18)}A${w * .15} ${h * .15} 0 1 1 ${point(.65,.18)}M${point(.5,.33)}L${point(.5,.65)}M${point(.15,.4)}L${point(.85,.4)}M${point(.15,1)}L${point(.5,.65)}L${point(.85,1)}`;
    case 'server': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(0,.33)}L${point(1,.33)}M${point(0,.66)}L${point(1,.66)}M${point(.1,.16)}L${point(.2,.16)}M${point(.1,.5)}L${point(.2,.5)}M${point(.1,.83)}L${point(.2,.83)}`;
    case 'queue': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(.25,0)}L${point(.25,1)}M${point(.5,0)}L${point(.5,1)}M${point(.75,0)}L${point(.75,1)}`;
    case 'uml-class': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(0,.28)}L${point(1,.28)}M${point(0,.62)}L${point(1,.62)}`;
    case 'uml-interface': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(0,.3)}L${point(1,.3)}`;
    case 'uml-package': return polygon([[0,.18],[0,0],[.4,0],[.4,.18],[1,.18],[1,1],[0,1]]);
    case 'uml-component': return polygon([[.12,0],[1,0],[1,1],[.12,1]]) + polygon([[0,.2],[.24,.2],[.24,.34],[0,.34]]) + polygon([[0,.62],[.24,.62],[.24,.76],[0,.76]]);
    case 'uml-note': return polygon([[0,0],[.8,0],[1,.2],[1,1],[0,1]]) + `M${point(.8,0)}L${point(.8,.2)}L${point(1,.2)}`;
    case 'uml-use-case': return ellipse(.5,.5,.5,.5);
    case 'uml-lifeline': return polygon([[0,0],[1,0],[1,.15],[0,.15]]) + `M${point(.5,.15)}L${point(.5,1)}`;
    case 'uml-activation': return polygon([[.35,0],[.65,0],[.65,1],[.35,1]]);
    case 'uml-initial': return ellipse(.5,.5,.5,.5);
    case 'uml-final': return ellipse(.5,.5,.5,.5) + ellipse(.5,.5,.3,.3);
    case 'uml-fork': return polygon([[0,.4],[1,.4],[1,.6],[0,.6]]);
    case 'bpmn-start': return ellipse(.5,.5,.5,.5);
    case 'bpmn-end': return ellipse(.5,.5,.5,.5) + ellipse(.5,.5,.42,.42);
    case 'bpmn-intermediate': return ellipse(.5,.5,.5,.5) + ellipse(.5,.5,.4,.4);
    case 'bpmn-task': return rounded(.12);
    case 'bpmn-subprocess': return rounded(.12) + polygon([[.42,.72],[.58,.72],[.58,.92],[.42,.92]]) + `M${point(.5,.75)}L${point(.5,.89)}M${point(.45,.82)}L${point(.55,.82)}`;
    case 'bpmn-gateway': return polygon([[.5,0],[1,.5],[.5,1],[0,.5]]) + `M${point(.35,.35)}L${point(.65,.65)}M${point(.65,.35)}L${point(.35,.65)}`;
    case 'bpmn-parallel': return polygon([[.5,0],[1,.5],[.5,1],[0,.5]]) + `M${point(.5,.25)}L${point(.5,.75)}M${point(.25,.5)}L${point(.75,.5)}`;
    case 'bpmn-data-object': return polygon([[0,0],[.75,0],[1,.25],[1,1],[0,1]]) + `M${point(.75,0)}L${point(.75,.25)}L${point(1,.25)}`;
    case 'bpmn-data-store': return `M${point(0,.15)}C${point(0,-.05)} ${point(1,-.05)} ${point(1,.15)}L${point(1,.85)}C${point(1,1.05)} ${point(0,1.05)} ${point(0,.85)}ZM${point(0,.15)}C${point(0,.35)} ${point(1,.35)} ${point(1,.15)}M${point(0,.25)}C${point(0,.45)} ${point(1,.45)} ${point(1,.25)}`;
    case 'bpmn-pool': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(.08,0)}L${point(.08,1)}`;
    case 'bpmn-message': return polygon([[0,0],[1,0],[1,1],[0,1]]) + `M${point(0,0)}L${point(.5,.55)}L${point(1,0)}`;
    default: return null;
  }
}

export function shapeFillPath(e:SceneElement):string|null{const path=shapePath(e);if(path)return path;const x=Math.min(e.x,e.x+e.width),y=Math.min(e.y,e.y+e.height),w=Math.abs(e.width),h=Math.abs(e.height);if(e.type==='ellipse')return`M${x} ${y+h/2}a${w/2} ${h/2} 0 1 0 ${w} 0a${w/2} ${h/2} 0 1 0 ${-w} 0`;if(e.type==='diamond')return`M${x+w/2} ${y}L${x+w} ${y+h/2}L${x+w/2} ${y+h}L${x} ${y+h/2}Z`;return['rectangle','frame','sticky','table','code','embed'].includes(e.type)?`M${x} ${y}h${w}v${h}h${-w}Z`:null;}
