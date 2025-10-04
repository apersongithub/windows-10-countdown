/* Shared utility helpers */

import { TIME_ZONE } from './config.js';

export function dateForWallTimeInZone({y,m,d,h=0,min=0,s=0}) {
  const t0 = Date.UTC(y, m - 1, d, h, min, s);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  });
  const parts = fmt.formatToParts(new Date(t0)).reduce((acc,p)=>{
    if (p.type!=='literal') acc[p.type]=p.value;
    return acc;
  }, {});
  const localUTC = Date.UTC(+parts.year, +parts.month -1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMs = localUTC - t0;
  return new Date(t0 - offsetMs);
}

export const clamp = (n,min,max)=>Math.min(max,Math.max(min,n));
export const randBetween = (a,b)=> a + Math.random()*(b-a);
export const formatNum = n => n.toString().padStart(2,'0');

export function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.fill();
}