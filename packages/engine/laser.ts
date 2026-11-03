export interface LaserPoint{x:number;y:number;time:number}
export const LASER_LIFETIME=1000;
export function laserTrail(points:LaserPoint[],now:number,next?:{x:number;y:number}):LaserPoint[]{const live=points.filter(p=>now-p.time<LASER_LIFETIME);return(next?[...live,{...next,time:now}]:live).slice(-200);}
