/* Disintegration & final stage sequence (optimized / cleaned) */
import { DISINTEGRATION_CONFIG as C, LS_KEYS } from './config.js';

const MAX_PARTICLES = 8000; // hard safety cap
let particleCount = 0;

export function runDisintegration() {
  return new Promise(resolve => {
    const container = document.getElementById('disintegrate-target');
    if (!container) { resolve(); return; }
    const layer = document.getElementById('disintegration-layer');
    if (!layer) { resolve(); return; }
    clearDisintegrationLayer(layer);

    particleCount = 0;
    createTextParticles(container, layer);
    createQRParticles(layer);
    container.style.visibility='hidden';
    setTimeout(()=> showQuestionStage(resolve), C.stageDelayMs);
  });
}

function safeAppendParticle(layer, el, lifeMs = 2600) {
  if (particleCount >= MAX_PARTICLES) {
    // Drop silently; safety
    return;
  }
  particleCount++;
  let cleaned = false;
  const cleanup = ()=>{
    if (cleaned) return;
    cleaned = true;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    particleCount--;
  };
  el.addEventListener('transitionend', cleanup, { once:true });
  setTimeout(cleanup, lifeMs + 500); // fallback
  layer.appendChild(el);
}

function createTextParticles(root, layer){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){ return n.nodeValue.trim()? NodeFilter.FILTER_ACCEPT: NodeFilter.FILTER_REJECT; }
  });

  const textNodes=[];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  const frag = document.createDocumentFragment();

  textNodes.forEach(node=>{
    const txt=node.nodeValue;
    const parent=node.parentElement;
    if(!parent) return;
    const temp=document.createElement('span');
    parent.insertBefore(temp,node);
    parent.removeChild(node);

    // Build spans into fragment to reduce layout recalcs
    const innerFrag=document.createDocumentFragment();
    for(let i=0;i<txt.length;i++){
      const ch=txt[i];
      const span=document.createElement('span');
      span.textContent=ch;
      span.style.whiteSpace= ch===' ' ? 'pre':'nowrap';
      span.style.display='inline-block';
      innerFrag.appendChild(span);
    }
    temp.appendChild(innerFrag);

    // Force layout once
    const letters = Array.from(temp.childNodes);
    letters.forEach(s=>{
      const b=s.getBoundingClientRect();
      spawnCharParticle(layer,s.textContent,b.left+b.width/2,b.top+b.height/2,getComputedStyle(s).fontSize);
    });
    temp.remove();
  });

  root.appendChild(frag);
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
  safeAppendParticle(layer,p,dur);
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
  safeAppendParticle(layer,dot,dDur);
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
      const py=r.top +(y/(rows-1))*r.height;
      spawnDot(layer,px,py);
      if (particleCount >= MAX_PARTICLES) return;
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
    if(q){
      q.classList.add('fade-out');
      setTimeout(()=>{
        q.remove();
        const p=document.createElement('p');
        p.textContent=C.finalMessage;
        stage.appendChild(p);
        try { localStorage.setItem(LS_KEYS.postStage,'1'); } catch(e){}
        resolve();
      },620);
    } else {
      resolve();
    }
  }, C.questionHoldMs);
}

export function injectFinalStageImmediate() {
  if (document.querySelector('.final-stage')) return;
  const stage=document.createElement('div');
  stage.className='final-stage';
  stage.style.animation='none';
  stage.style.opacity='1';
  stage.innerHTML = `<p style="font-size:clamp(1rem,1.9vw,2rem); letter-spacing:.5px;">${C.finalMessage}</p>`;
  document.body.appendChild(stage);
}

export function clearDisintegrationLayer(layer = document.getElementById('disintegration-layer')) {
  if(!layer) return;
  while(layer.firstChild) layer.removeChild(layer.firstChild);
  particleCount = 0;
}