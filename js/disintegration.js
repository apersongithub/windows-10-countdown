/* Disintegration & final stage sequence */
import { DISINTEGRATION_CONFIG as C } from './config.js';

export function runDisintegration() {
  return new Promise(resolve => {
    const container = document.getElementById('disintegrate-target');
    if (!container) { resolve(); return; }
    const layer = document.getElementById('disintegration-layer');
    createTextParticles(container, layer);
    createQRParticles(layer);
    container.style.visibility='hidden';
    setTimeout(()=> showQuestionStage(resolve), C.stageDelayMs);
  });
}

function createTextParticles(root, layer){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){ return n.nodeValue.trim()? NodeFilter.FILTER_ACCEPT: NodeFilter.FILTER_REJECT; }
  });
  const nodes=[];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const txt=node.nodeValue;
    const parent=node.parentElement;
    const temp=document.createElement('span');
    parent.insertBefore(temp,node);
    parent.removeChild(node);
    for(let i=0;i<txt.length;i++){
      const ch=txt[i];
      const span=document.createElement('span');
      span.textContent=ch;
      span.style.whiteSpace= ch===' ' ? 'pre':'nowrap';
      span.style.display='inline-block';
      temp.appendChild(span);
    }
    Array.from(temp.childNodes).forEach(s=>{
      const b=s.getBoundingClientRect();
      spawnCharParticle(layer,s.textContent,b.left+b.width/2,b.top+b.height/2,getComputedStyle(s).fontSize);
    });
    temp.remove();
  });
}

function spawnCharParticle(layer,char,px,py,fontSize){
  const p=document.createElement('span');
  p.className='particle-char';
  p.textContent=char;
  p.style.left=px+'px';
  p.style.top=py+'px';
  p.style.fontSize=fontSize;
  const distX=(Math.random()*C.spread)*(Math.random()<0.5?-1:1);
  const distY=-(Math.random()*C.rise);
  const dur=C.durationCharMin+Math.random()*(C.durationCharMax-C.durationCharMin);
  const rot=(Math.random()*720-360);
  p.style.transition=`transform ${dur}ms ${C.easing}, opacity ${dur}ms linear`;
  layer.appendChild(p);
  requestAnimationFrame(()=>{
    p.style.transform=`translate(${distX}px,${distY}px) rotate(${rot}deg) scale(${0.4+Math.random()*0.4})`;
    p.style.opacity='0';
  });
  for(let d=0; d<C.dotMultiplier; d++){
    spawnDot(layer,px,py);
  }
}

function spawnDot(layer,px,py){
  const dot=document.createElement('div');
  dot.className='particle-dot';
  dot.style.left=px+'px';
  dot.style.top=py+'px';
  const distX=(Math.random()*C.spread*0.5)*(Math.random()<0.5?-1:1);
  const distY=-(Math.random()*C.rise*1.1);
  const dDur=700+Math.random()*900;
  dot.style.transition=`transform ${dDur}ms ${C.easing}, opacity ${dDur}ms linear`;
  layer.appendChild(dot);
  requestAnimationFrame(()=>{
    dot.style.transform=`translate(${distX}px,${distY}px) scale(${0.3+Math.random()*0.6})`;
    dot.style.opacity='0';
  });
}

function createQRParticles(layer){
  const qr=document.getElementById('qr-image');
  if(!qr) return;
  const r=qr.getBoundingClientRect();
  const cols=C.qrDotDensity*(r.width/100);
  const rows=C.qrDotDensity*(r.height/100);
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      if(Math.random()<0.45) continue;
      const px=r.left+(x/(cols-1))*r.width;
      const py=r.top+(y/(rows-1))*r.height;
      spawnDot(layer,px,py);
    }
  }
}

function showQuestionStage(resolve){
  const stage=document.createElement('div');
  stage.className='final-stage';
  stage.innerHTML='<h1 id="qStage">11?</h1>';
  document.body.appendChild(stage);
  setTimeout(()=>{
    const q=document.getElementById('qStage');
    q.classList.add('fade-out');
    setTimeout(()=>{
      q.remove();
      const p=document.createElement('p');
      p.textContent=C.finalMessage;
      stage.appendChild(p);
      resolve();
    },620);
  }, C.questionHoldMs);
}