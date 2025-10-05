/* Bootstraps countdown, disintegration, and game with EOL gate & persistent unlock */
import { initCountdown } from './countdown.js';
import { runDisintegration, injectFinalStageImmediate } from './disintegration.js';
import { initGame, startGame, startInfiniteGame, showPlayPrompt } from './game.js';
import { COUNTDOWN_CONFIG, LS_KEYS, PERSIST_UNLOCK_BEFORE_EOL } from './config.js';
import { dateForWallTimeInZone } from './utils.js';

const playPromptEl = document.getElementById('play-prompt');

let gameUnlocked = false;
let skipped = false;

function markUnlocked() {
  gameUnlocked = true;
  showPlayPrompt();
}

function onEOL() {
  if (skipped) return;
  setTimeout(()=>{
    runDisintegration().then(()=>{
      markUnlocked();
    });
  }, 600);
}

// Check persistence BEFORE setting up countdown
const postFlag = localStorage.getItem(LS_KEYS.postStage) === '1';
const targetDate = dateForWallTimeInZone(COUNTDOWN_CONFIG.target);
const now = new Date();

if (postFlag && (PERSIST_UNLOCK_BEFORE_EOL || now >= targetDate)) {
  // Skip disintegration entirely
  skipped = true;
  const disTarget = document.getElementById('disintegrate-target');
  if (disTarget) disTarget.style.visibility='hidden';
  injectFinalStageImmediate();
  markUnlocked();
}

// If we didn't skip, initialize normal flow
if (!skipped) {
  initCountdown(onEOL);
}

initGame();

playPromptEl.addEventListener('click', ()=>{
  if (!gameUnlocked) return;
  startGame();
});

window.addEventListener('keydown', e=>{
  if (!gameUnlocked) return;
  const visible = playPromptEl.style.display !== 'none';
  if (!visible) return;
  if (e.key==='g' || e.key==='G') {
    startGame();
  } else if (e.key==='i' || e.key==='I') {
    if (localStorage.getItem(LS_KEYS.infinite) === '1') {
      startInfiniteGame();
    }
  }
});

/* Nuke overlay event hooks */
window.addEventListener('nuke:retry', () => {
  if (gameUnlocked) startGame();
});
window.addEventListener('nuke:infinite', () => {
  if (gameUnlocked && localStorage.getItem(LS_KEYS.infinite) === '1') {
    startInfiniteGame();
  } else if (gameUnlocked) {
    startGame();
  }
});
window.addEventListener('nuke:close', () => {
  if (gameUnlocked) showPlayPrompt();
});

/* ------------------------------------------------------------------
   SIMPLE HOTKEYS
   Insert  -> Immediately set postStage flag & reload (skip countdown)
   Delete  -> Confirm, clear all defendUpdates* keys (and postStage), then reload
   Keeps a small popup hint.
------------------------------------------------------------------- */
(function simpleHotkeys(){
  const POST_STAGE_KEY = LS_KEYS.postStage;

  function skipAndReload(){
    try { localStorage.setItem(POST_STAGE_KEY,'1'); } catch {}
    const base = location.origin + location.pathname;
    location.replace(base + '?skip=' + Date.now());
  }

  function resetAndReload(){
    if(!confirm('Reset ALL saved game data and restart countdown?')) return;
    try {
      const removeList = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && k.startsWith('defendUpdates')) removeList.push(k);
      }
      removeList.forEach(k=>{ try { localStorage.removeItem(k); } catch {} });
      try { localStorage.removeItem(POST_STAGE_KEY); } catch {}
    } catch {}
    const base = location.origin + location.pathname;
    location.replace(base + '?reset=' + Date.now());
  }

  window.addEventListener('keydown',(e)=>{
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'Insert' || e.code === 'Insert' || e.key === 'Ins'){
      e.preventDefault();
      skipAndReload();
    } else if (e.key === 'Delete' || e.code === 'Delete'){
      e.preventDefault();
      resetAndReload();
    }
  }, { capture:true });

  function showHint(){
    const ID='countdown-hotkey-hint';
    if(document.getElementById(ID)) return;
    const div=document.createElement('div');
    div.id=ID;
    div.textContent='Ins/Double Tap QR: Skip countdown  •  Delete: Reset data';
    div.style.cssText=`
      position:fixed;
      bottom:10px;
      right:12px;
      z-index:9999;
      font:600 11px Segoe UI,Inter,sans-serif;
      color:#fff;
      background:rgba(0,0,0,0.50);
      padding:6px 10px;
      border:1px solid rgba(255,255,255,0.25);
      border-radius:8px;
      letter-spacing:.4px;
      backdrop-filter:blur(4px);
      -webkit-font-smoothing:antialiased;
      pointer-events:none;
      user-select:none;
      max-width:360px;
      text-align:center;
      line-height:1.25;
      opacity:1;
      transition:opacity .7s;
    `;
    document.body.appendChild(div);
    setTimeout(()=>{ div.style.opacity='0'; }, 3200);
    setTimeout(()=>{ if(div.parentNode) div.remove(); }, 16000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', showHint);
  } else {
    showHint();
  }
})();

/* ------------------------------------------------------------------
   DOUBLE TAP / QUICK DOUBLE CLICK ON QR IMAGE TO SKIP (Insert equivalent)
   - Works for touch (pointer/touch) and mouse
   - Re-uses same behavior: set postStage + reload
------------------------------------------------------------------- */
(function qrDoubleTapSkip(){
  const EL_ID = 'qr-image';
  const POST_STAGE_KEY = LS_KEYS.postStage;

  const DOUBLE_TAP_MS   = 340;
  const MIN_INTERVAL_MS = 50;
  const MOVE_TOLERANCE  = 28;

  let lastTime = 0;
  let lastX = 0;
  let lastY = 0;

  function skip(){
    try { localStorage.setItem(POST_STAGE_KEY,'1'); } catch {}
    const base = location.origin + location.pathname;
    location.replace(base + '?skip=' + Date.now());
  }

  function isDouble(ev){
    const now = performance.now();
    let x,y;
    if(ev.changedTouches && ev.changedTouches.length){
      const t=ev.changedTouches[0];
      x=t.clientX; y=t.clientY;
    } else {
      x=ev.clientX; y=ev.clientY;
    }
    const dt = now - lastTime;
    const dx = Math.abs(x - lastX);
    const dy = Math.abs(y - lastY);
    lastTime = now;
    lastX = x;
    lastY = y;
    return (dt > MIN_INTERVAL_MS && dt < DOUBLE_TAP_MS && dx < MOVE_TOLERANCE && dy < MOVE_TOLERANCE);
  }

  function handler(ev){
    // Ignore multi-touch gestures
    if(ev.touches && ev.touches.length > 1) return;
    if(isDouble(ev)){
      ev.preventDefault();
      ev.stopPropagation();
      skip();
    }
  }

  function attach(el){
    if(!el || el.__qrSkipBound) return;
    el.__qrSkipBound = true;
    if(window.PointerEvent){
      el.addEventListener('pointerup', handler, { passive:false });
    } else {
      el.addEventListener('touchend', handler, { passive:false });
      el.addEventListener('mouseup', handler);
    }
  }

  function init(){
    const el = document.getElementById(EL_ID);
    if(el){ attach(el); return; }
    // Observe briefly if QR appears later
    const obs = new MutationObserver(()=>{
      const found = document.getElementById(EL_ID);
      if(found){
        attach(found);
        obs.disconnect();
      }
    });
    try{
      obs.observe(document.documentElement,{ childList:true, subtree:true });
      setTimeout(()=>obs.disconnect(),3000);
    }catch{}
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();