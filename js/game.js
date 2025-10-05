/* ============================================================================
   Defender Game - game.js
   Optimized + Victory UI Parity + Sticky Keys Enhanced Panel + Infinite Parity
   + Mobile (Touch) Snipping Tool Support
   + Core Audio Performance Optimizations (Adaptive + Lean + WebAudio micro cache)
   ============================================================================ */

import {
  HIGH_SCORE_KEY, SIZE_TIERS, DIFFICULTY, BLOCK_STYLE, EFFECTS,
  BOSS_CONFIG, HAZARDS, HAZARD_SPEED, REQUIRE_PERFECT_VICTORY,
  REDIRECT_ON_LOSS, LOSS_REDIRECT_URL, LS_KEYS, LIFE_BLOCK,
  AUDIO, TASKBAR_STYLE, BOMB_CONFIG, SNIP_POWERUP,
  SHIELD_POWERUP, TASKMGR_POWERUP, SOUNDWAVE_POWERUP, SOUNDWAVE_UNLOCK_KEY,
  STICKY_KEYS
} from './config.js';
import { randBetween, roundedRect } from './utils.js';
import { triggerNuke } from './nuke.js';
import { MUSIC } from './config.js';

/* -------------------- Additional Unlock / Redirect Options -------------------- */
const STICKY_UNLOCK_KEY = 'defendUpdatesStickyUnlocked';
const STICKY_SCORE_UNLOCK_THRESHOLD = 500;
const INFINITE_REDIRECT_ON_LOSS = false;

/* -------------------- Core Constants -------------------- */
const INFINITE_UNLOCK_KEY = LS_KEYS.infinite;
const BASE_OVERLAY_BG = 'rgba(0,44,92,0.85)';
const START_IMMUNITY_MS = 300;
const SHOW_ESU_SCREEN = true;

/* Boss death animation constants */
const BOSS_DEATH_DURATION = 1600;
const BOSS_DEATH_FLASH_FREQ = 110;
const BOSS_DEATH_PARTICLE_COUNT = 70;
const BOSS_DEATH_PARTICLE_LIFE = 1400;
const BOSS_DEATH_PARTICLE_SIZE = [5, 18];
const BOSS_DEATH_PARTICLE_SPEED = [80, 440];
const BOSS_DEATH_PARTICLE_SPIN = [-600, 600];

/* Screen shake presets */
const SHAKE_DAMAGE_INTENSITY = 14;
const SHAKE_DAMAGE_DURATION = 180;
const SHAKE_DEATH_INTENSITY = 34;
const SHAKE_DEATH_DURATION = 550;
const SHAKE_LIFE_LOST_INTENSITY = 9;
const SHAKE_LIFE_LOST_DURATION = 260;

/* FX & Misc */
const CATCH_PARTICLE_COUNT_BASE = 10;
const SMALL_BLOCK_LABELS = new Set(['4KB','5KB']);
const LIFE_PULSE_RADIUS = 70;

/* Bomb fallback constants */
const BOMB_EXPLOSION_DURATION = BOMB_CONFIG.explosionDuration || 620;
const BOMB_SHARD_COUNT = BOMB_CONFIG.explosionShardCount || 28;
const BOMB_SHARD_SPEED = BOMB_CONFIG.explosionShardSpeedRange || [180, 520];
const BOMB_SHARD_SIZE = BOMB_CONFIG.explosionShardSizeRange || [4, 14];

/* Vanish animation */
const POWERUP_VANISH_DURATION = 520;
const POWERUP_VANISH_SCALE = 1.45;

/* -------------------- Persistent State -------------------- */
let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0',10) || 0;
let newHigh = false;
let infiniteUnlocked = localStorage.getItem(INFINITE_UNLOCK_KEY) === '1';
let infiniteMode = false;

/* -------------------- Runtime State -------------------- */
let gameActive=false;
let gamePaused=false;
let nukeTriggered=false;

let score=0;
let lives=DIFFICULTY.lives;
let spawnInterval=DIFFICULTY.baseSpawnInterval;
let lastSpawn=0;

let blocks=[];
let paddleX=0;
let canvas, ctx, hudEl, overlayEl, msgEl;
let rafId=null;
let lastTs=0;
let frameCounter=0;

/* Boss */
let lastBossHazardSfx = 0;
let bossActive=false;
let bossHealth=BOSS_CONFIG.health;
let bossDropInterval=BOSS_CONFIG.dropIntervalStart;
let lastBossDrop=0;
let bossStartTime=0;
let bossDying=false;
let bossDeathStart=0;
let bossDeathParticles=[];

let stickyJustUnlocked = false;
let soundwaveJustUnlocked = false;

/* Life spawn gating */
let gameStartTime=0;
let lastLifeSpawnScore=0;

/* Shake */
let shakeStart=0, shakeDuration=0, shakeIntensity=0, shakeMode='all';

/* FX Arrays */
let catchParticles=[];
let floatTexts=[];
let ringPulses=[];
let powerupVanishFX=[];

/* Images */
let bossLogoImg=null, bossLogoReady=false;
let bombImg=null, bombImgReady=false;
let snipImg=null, snipImgReady=false;
let lifeImg=null, lifeImgReady=false;
let shieldImg=null, shieldImgReady=false;
let taskMgrImg=null, taskMgrImgReady=false;
let soundwaveImg=null, soundwaveImgReady=false;
let stickyImg=null, stickyImgReady=false;
let stickyLockImgClosed=null, stickyLockImgClosedReady=false;
let stickyLockImgOpen=null, stickyLockImgOpenReady=false;

/* -------------------- Audio (with pooling + safe fail) -------------------- */
const AUDIO_LOAD_TIMEOUT_MS = 5000;
const LOG_MISSING_AUDIO_ONCE = false;

let audioLoaded = false;
const audioBank = {};
const unavailableAudio = new Set();
const missingWarned = new Set();

/* Music System */
const musicBank = {};
let currentMusicKey = null;
let currentMusicNode = null;
let fadingOutNode = null;
let musicTransitioning = false;
let pauseDuckActive = false;

/* Timers / Spawn states */
let lastBombSpawn=0, nextBombSpawnDelay=0;
let lastSnipSpawn=0, nextSnipSpawnDelay=0;
let snipReady=false, snipAimStart=0;
let snipDragging=false, snipDragStarted=false;
let snipRect=null, snipDragOrigin=null;
let snipExecuted=false;

let lastShieldSpawn=0, nextShieldSpawnDelay=0;
let shieldActive=false, shieldEndTime=0;

let lastTaskMgrSpawn=0, nextTaskMgrSpawnDelay=0;
let slowMoActive=false, slowMoEnd=0;
let slowMoFactor=1;

let soundwaveUnlocked = localStorage.getItem(SOUNDWAVE_UNLOCK_KEY)==='1';
let lastSoundwaveSpawn=0, nextSoundwaveSpawnDelay=0;
let activeSoundwaveSlowMo=false, activeSoundwaveSlowMoEnd=0;

let stickyUnlocked = (localStorage.getItem(STICKY_UNLOCK_KEY)==='1') || infiniteUnlocked;
let lastStickySpawn=0, nextStickySpawnDelay=0;
let stickyKeysActive=false, stickyKeysEnd=0;
let stickyLockX = null;
let stickyLockAnim = null;

let lifeEverLost=false;

/* Performance flags */
let listenersBound=false;
let hudDirty=true;

/* Mobile snip helper state */
let snipMultiTouch = false;
let snipLastTapTime = 0;
const SNIP_MIN_TOUCH_SIZE = 18;
const SNIP_DOUBLE_TAP_MS = 300;

/* -------------------- Adaptive Audio Core (ESSENTIAL ONLY) -------------------- */
/* Frame-time sampling (no overlay) */
let perfWindow = [];
let perfLastSampleTs = 0;
let audioDegradeLevel = 0; // 0 normal, 1 mild, 2 medium, 3 severe
const PERF_SAMPLE_INTERVAL = 500;     // ms between samples
const PERF_WINDOW_MS = 5000;          // rolling window size
const PERF_THRESHOLDS = [26, 32, 40]; // average frame time ms boundaries -> levels

/* Lean SFX groups (coalesces spammy events at degrade >=2) */
const LEAN_GROUPS = {
  ticks:   { keys:new Set(['bombTick']),            minGap:180, lastPlay:0, proxy:'bombTick' },
  catches: { keys:new Set(['catchTiny','catchBlock']), minGap:140, lastPlay:0, proxy:'catchBlock' }
};
let leanMode = true;

/* Web Audio micro-engine for tiny repeated SFX */
let waCtx = null;
const waBuffers = {};
/* ==== ADD NEAR OTHER TOP-LEVEL CONSTANTS (after other core constants) ==== */
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent);

/* ==== FIND the Web Audio micro-engine WA_KEYS SET and REPLACE IT ==== */
// Old:
// const WA_KEYS = new Set(['bombTick','catchTiny','catchBlock']);
// New (adds bombSpawn):
const WA_KEYS = new Set(['bombTick','catchTiny','catchBlock','bombSpawn']);
function ensureAudioCtx(){
  if(!waCtx){
    try{ waCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch{}
  }
}
async function loadWebAudioBuffers(){
  if(!AUDIO.enabled) return;
  ensureAudioCtx();
  if(!waCtx) return;
  const entries = Object.entries(AUDIO.files).filter(([k])=>WA_KEYS.has(k));
  for(const [k, path] of entries){
    if(waBuffers[k]) continue;
    try{
      const resp = await fetch(path);
      const arr = await resp.arrayBuffer();
      waBuffers[k] = await waCtx.decodeAudioData(arr);
    }catch{
      // Silent fail; fallback to HTMLAudio path
    }
  }
}

/* -------------------- HUD Helpers -------------------- */
function markHudDirty(){ hudDirty=true; }

/* -------------------- Listener Bind / Unbind -------------------- */
function bindGameListeners(){
  if(listenersBound) return;
  window.addEventListener('resize',resizeCanvas);
  window.addEventListener('mousemove',onMouseMove);
  window.addEventListener('touchmove',onTouchMove,{passive:false});
  window.addEventListener('keydown',onGameKey);
  window.addEventListener('mousedown',onPointerDown);
  window.addEventListener('mouseup',onPointerUp);
  window.addEventListener('mousemove',onPointerMove);
  window.addEventListener('touchstart',onTouchStart,{passive:false});
  window.addEventListener('touchend',onTouchEnd,{passive:false});
  window.addEventListener('touchmove',onTouchDrag,{passive:false});
  listenersBound=true;
}
function unbindGameListeners(){
  if(!listenersBound) return;
  window.removeEventListener('resize',resizeCanvas);
  window.removeEventListener('mousemove',onMouseMove);
  window.removeEventListener('touchmove',onTouchMove);
  window.removeEventListener('keydown',onGameKey);
  window.removeEventListener('mousedown',onPointerDown);
  window.removeEventListener('mouseup',onPointerUp);
  window.removeEventListener('mousemove',onPointerMove);
  window.removeEventListener('touchstart',onTouchStart);
  window.removeEventListener('touchend',onTouchEnd);
  window.removeEventListener('touchmove',onTouchDrag);
  listenersBound=false;
}

/* -------------------- Music -------------------- */
function loadMusicBank(){
  if(!MUSIC?.enabled) return;
  for(const [key, src] of Object.entries(MUSIC.tracks)){
    if(!src) continue;
    const a = new Audio(src);
    a.preload='auto';
    a.loop=true;
    a.volume=0;
    musicBank[key]=a;
  }
}
function playMusic(key,{immediate=false, force=false}={}){
  if(!MUSIC.enabled) return;
  if(!musicBank[key]) return;
  if(!force && key===currentMusicKey) return;
  const newNode=musicBank[key];
  const oldNode=currentMusicNode;
  try{ newNode.currentTime=0; }catch{}
  if(immediate){
    if(oldNode && oldNode!==newNode) oldNode.pause();
    newNode.volume=MUSIC.volumeMaster;
    newNode.play().catch(()=>{});
    currentMusicNode=newNode;
    currentMusicKey=key;
    return;
  }
  musicTransitioning=true;
  const crossfadeMs=MUSIC.crossfadeMs||1200;
  const startTime=performance.now();
  const targetVol=MUSIC.volumeMaster;
  newNode.volume=0;
  newNode.play().catch(()=>{});
  currentMusicNode=newNode;
  currentMusicKey=key;
  fadingOutNode=oldNode && oldNode!==newNode ? oldNode:null;
  function step(){
    const now=performance.now();
    const t=Math.min(1,(now - startTime)/crossfadeMs);
    const eased=t*t*(3-2*t);
    newNode.volume=targetVol*eased;
    if(fadingOutNode){
      fadingOutNode.volume=targetVol*(1 - eased);
      if(t>=1){
        try{fadingOutNode.pause();}catch{}
      }
    }
    if(t<1) requestAnimationFrame(step);
    else {
      fadingOutNode=null;
      musicTransitioning=false;
    }
  }
  requestAnimationFrame(step);
}
function fadeOutAndStopMusic(durationMs = MUSIC.fadeOutMs || 800){
  if(!currentMusicNode) return;
  const node=currentMusicNode;
  const startVol=node.volume;
  const start=performance.now();
  function step(){
    const now=performance.now();
    const t=Math.min(1,(now - start)/durationMs);
    node.volume=startVol*(1 - t);
    if(t<1) requestAnimationFrame(step);
    else {
      try{node.pause();}catch{}
      if(node===currentMusicNode){
        currentMusicNode=null;
        currentMusicKey=null;
      }
    }
  }
  requestAnimationFrame(step);
}
function applyPauseDuck(){
  if(!MUSIC.enabled||!currentMusicNode||pauseDuckActive) return;
  pauseDuckActive=true;
  const node=currentMusicNode;
  const startVol=node.volume;
  const target=MUSIC.volumeMaster*(MUSIC.pauseDuckFactor??0.4);
  const dur=220; const start=performance.now();
  function step(){
    const now=performance.now();
    const t=Math.min(1,(now - start)/dur);
    node.volume=startVol + (target - startVol)*t;
    if(t<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function removePauseDuck(){
  if(!pauseDuckActive||!currentMusicNode) return;
  pauseDuckActive=false;
  const node=currentMusicNode;
  const startVol=node.volume;
  const target=MUSIC.volumeMaster;
  const dur=MUSIC.resumeFadeMs||400;
  const start=performance.now();
  function step(){
    const now=performance.now();
    const t=Math.min(1,(now - start)/dur);
    node.volume=startVol + (target - startVol)*t;
    if(t<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* -------------------- Slow Motion -------------------- */
function adjustDtForSlowMo(rawDt){
  let factor=1;
  if(slowMoActive){
    if(performance.now()>slowMoEnd){
      slowMoActive=false;
      slowMoFactor=1;
    } else factor*=slowMoFactor;
  }
  if(activeSoundwaveSlowMo){
    if(performance.now()>activeSoundwaveSlowMoEnd){
      activeSoundwaveSlowMo=false;
    } else factor*=SOUNDWAVE_POWERUP.slowMoFactor;
  }
  return rawDt*factor;
}

/* -------------------- Asset Loading -------------------- */
function loadBossLogo(){ if(bossLogoImg||bossLogoReady) return;
  bossLogoImg=new Image(); bossLogoImg.onload=()=>bossLogoReady=true;
  bossLogoImg.onerror=()=>bossLogoReady=false;
  bossLogoImg.src=BOSS_CONFIG.logoSrc;
}
function loadBombImage(){ if(bombImg||bombImgReady) return;
  if(!BOMB_CONFIG.imageSrc) return;
  bombImg=new Image(); bombImg.onload=()=>bombImgReady=true;
  bombImg.onerror=()=>bombImgReady=false;
  bombImg.src=BOMB_CONFIG.imageSrc;
}
function loadSnipImage(){ if(snipImg||snipImgReady) return;
  if(!SNIP_POWERUP.imageSrc) return;
  snipImg=new Image(); snipImg.onload=()=>snipImgReady=true;
  snipImg.onerror=()=>snipImgReady=false;
  snipImg.src=SNIP_POWERUP.imageSrc;
}
function loadLifeImage(){ if(lifeImg||lifeImgReady) return;
  if(!LIFE_BLOCK.imageSrc) return;
  lifeImg=new Image(); lifeImg.onload=()=>lifeImgReady=true;
  lifeImg.onerror=()=>lifeImgReady=false;
  lifeImg.src=LIFE_BLOCK.imageSrc;
}
function loadShieldImage(){ if(shieldImg||shieldImgReady) return;
  if(!SHIELD_POWERUP.imageSrc) return;
  shieldImg=new Image(); shieldImg.onload=()=>shieldImgReady=true;
  shieldImg.onerror=()=>shieldImgReady=false;
  shieldImg.src=SHIELD_POWERUP.imageSrc;
}
function loadTaskMgrImage(){ if(taskMgrImg||taskMgrImgReady) return;
  if(!TASKMGR_POWERUP.imageSrc) return;
  taskMgrImg=new Image(); taskMgrImg.onload=()=>taskMgrImgReady=true;
  taskMgrImg.onerror=()=>taskMgrImgReady=false;
  taskMgrImg.src=TASKMGR_POWERUP.imageSrc;
}
function loadSoundwaveImage(){ if(soundwaveImg||soundwaveImgReady) return;
  if(!SOUNDWAVE_POWERUP.imageSrc) return;
  soundwaveImg=new Image(); soundwaveImg.onload=()=>soundwaveImgReady=true;
  soundwaveImg.onerror=()=>soundwaveImgReady=false;
  soundwaveImg.src=SOUNDWAVE_POWERUP.imageSrc;
}
function loadStickyImage(){ if(stickyImg||stickyImgReady) return;
  if(!STICKY_KEYS.imageSrc) return;
  stickyImg=new Image(); stickyImg.onload=()=>stickyImgReady=true;
  stickyImg.onerror=()=>stickyImgReady=false;
  stickyImg.src=STICKY_KEYS.imageSrc;
}
function loadStickyLockImages(){
  if(STICKY_KEYS.lockLockedSrc && !stickyLockImgClosed){
    stickyLockImgClosed=new Image();
    stickyLockImgClosed.onload=()=>stickyLockImgClosedReady=true;
    stickyLockImgClosed.onerror=()=>stickyLockImgClosedReady=false;
    stickyLockImgClosed.src=STICKY_KEYS.lockLockedSrc;
  }
  if(STICKY_KEYS.lockUnlockedSrc && !stickyLockImgOpen){
    stickyLockImgOpen=new Image();
    stickyLockImgOpen.onload=()=>stickyLockImgOpenReady=true;
    stickyLockImgOpen.onerror=()=>stickyLockImgOpenReady=false;
    stickyLockImgOpen.src=STICKY_KEYS.lockUnlockedSrc;
  }
}
function loadAllImages(){
  loadBossLogo(); loadBombImage(); loadSnipImage(); loadLifeImage();
  loadShieldImage(); loadTaskMgrImage(); loadSoundwaveImage(); loadStickyImage();
  loadStickyLockImages();
}

/* -------------------- Audio Loading -------------------- */
function loadAudioBank(){
  if (audioLoaded || !AUDIO.enabled) return;
  for (const [key, path] of Object.entries(AUDIO.files)){
    if (!path) continue;
    const a = new Audio();
    a.preload='auto';
    a.src=path;
    a.volume=(AUDIO.volumeMaster ?? 1)*(AUDIO.perClipVolume?.[key] ?? 1);
    let done=false;
    const timeoutId=setTimeout(()=>{
      if(done) return;
      done=true;
      markAudioUnavailable(key, `timeout after ${AUDIO_LOAD_TIMEOUT_MS}ms`);
    }, AUDIO_LOAD_TIMEOUT_MS);
    a.addEventListener('canplaythrough',()=>{
      if(done) return;
      done=true;
      clearTimeout(timeoutId);
      audioBank[key]=a;
    }, { once:true });
    a.addEventListener('error',()=>{
      if(done) return;
      done=true;
      clearTimeout(timeoutId);
      markAudioUnavailable(key,'error event');
    }, { once:true });
  }
  audioLoaded=true;
}
function markAudioUnavailable(key, reason){
  unavailableAudio.add(key);
  if(LOG_MISSING_AUDIO_ONCE && !missingWarned.has(key)){
    console.warn(`[audio] Disabled "${key}" (${reason})`);
    missingWarned.add(key);
  }
}

/* Pools for certain keys */
const SFX_POOL_KEYS = new Set(['bombTick','bombSpawn','catchTiny','catchBlock']);
const sfxPools = {};
const POOL_SIZE = 4;
let lastPlayTimePerKey = Object.create(null);

/* -------------------- playSfx (with adaptive + lean + webaudio) -------------------- */
function playSfx(initialKey, { allowOverlap = true, volumeScale = 1 } = {}){
  if (!AUDIO.enabled) return;
  if (unavailableAudio.has(initialKey)) return;

  let key = initialKey;

  /* Adaptive degrade: skip / modify based on level */
  // (Rules intentionally minimal & cheap)
  if(audioDegradeLevel === 1){
    // Mild: slightly thin bombTick
    if(key==='bombTick' && Math.random()<0.5) return;
  } else if(audioDegradeLevel === 2){
    // Medium: heavy thinning of bombTick + partial catch suppression
    if(key==='bombTick' && Math.random()<0.8) return;
    if(key==='catchTiny' && Math.random()<0.5) return;
    if(key==='catchBlock') allowOverlap=false;
  } else if(audioDegradeLevel === 3){
    // Severe: only keep core impactful sounds
    const essential=new Set(['miss','bombExplode','bossSpawn','victory','nuke','bossHit','stickyHit','shieldBlock','lifeGain']);
    if(!essential.has(key)) return;
    allowOverlap=false;
    volumeScale*=0.85;
  }

  /* Lean mode grouping (only when degrade >=2) */
  if(leanMode && audioDegradeLevel >= 2){
    for(const group of Object.values(LEAN_GROUPS)){
      if(group.keys.has(key)){
        const nowT=performance.now();
        if(nowT - group.lastPlay < group.minGap) return;
        key = group.proxy; // unify to a single representative sound
        group.lastPlay=nowT;
        break;
      }
    }
  }

  /* WebAudio tiny path (skip when severe degrade to cut mixing entirely) */
  if(audioDegradeLevel < 3 && WA_KEYS.has(key) && waCtx && waBuffers[key]){
    try{
      const src=waCtx.createBufferSource();
      src.buffer=waBuffers[key];
      const gain=waCtx.createGain();
      const baseVol=(AUDIO.volumeMaster ?? 1)*(AUDIO.perClipVolume?.[key] ?? 1)*volumeScale;
      gain.gain.value=baseVol;
      src.connect(gain).connect(waCtx.destination);
      src.start();
    }catch{}
    return;
  }

  /* HTMLAudio fallback */
  const baseClip = audioBank[key];
  if(!baseClip || baseClip.readyState < 2) return;

  const now=performance.now();
  if(key==='bombTick'){
    if(lastPlayTimePerKey[key] && now - lastPlayTimePerKey[key] < 80) return;
    lastPlayTimePerKey[key]=now;
  }

  const baseVol=(AUDIO.volumeMaster ?? 1)*(AUDIO.perClipVolume?.[key] ?? 1);
  const finalVol=Math.min(1, baseVol * volumeScale);

  if(!SFX_POOL_KEYS.has(key)){
    if(allowOverlap){
      try{
        const clone=baseClip.cloneNode();
        if(!clone || !clone.play) return;
        clone.volume=finalVol;
        clone.currentTime=0;
        clone.play().catch(()=>{});
      }catch{}
      return;
    }
    if(!baseClip.paused) return;
    try{
      baseClip.volume=finalVol;
      baseClip.currentTime=0;
      baseClip.play().catch(()=>{});
    }catch{}
    return;
  }

  if(!sfxPools[key]){
    sfxPools[key]={ voices:[], idx:0 };
    for(let i=0;i<POOL_SIZE;i++){
      try{
        const v=baseClip.cloneNode();
        if(!v || !v.play) continue;
        v.volume=finalVol;
        sfxPools[key].voices.push(v);
      }catch{}
    }
    if(sfxPools[key].voices.length===0){
      markAudioUnavailable(key,'pool creation failed');
      return;
    }
  }

  const pool=sfxPools[key];
  const voice=pool.voices[pool.idx];
  pool.idx=(pool.idx+1)%pool.voices.length;
  if(!voice || !voice.play) return;
  try{
    voice.volume=finalVol;
    voice.currentTime=0;
    voice.play().catch(()=>{});
  }catch{}
}

/* -------------------- SIZE_TIER Precomputation -------------------- */
let sizeTierCache=null;
function precomputeSizeTierWidths(){
  if(!ctx) return;
  sizeTierCache = SIZE_TIERS.map(t=>{
    ctx.save();
    ctx.font=BLOCK_STYLE.textFont;
    const w=Math.max(54, Math.ceil(ctx.measureText(t.label).width + 14*2));
    ctx.restore();
    return { ...t, width:w, height:36 };
  });
}

/* -------------------- Text / Normal Blocks -------------------- */
function measureBlockText(label,font){
  ctx.save(); ctx.font=font;
  const m=ctx.measureText(label);
  const ascent=m.actualBoundingBoxAscent||m.emHeightAscent||10;
  const descent=m.actualBoundingBoxDescent||m.emHeightDescent||4;
  ctx.restore();
  return {width:m.width, ascent, descent};
}
function drawNormalBlock(b){
  ctx.fillStyle=b.caught?BLOCK_STYLE.caughtColor:BLOCK_STYLE.bgColor;
  roundedRect(ctx,b.x,b.y,b.w,b.h,BLOCK_STYLE.cornerRadius);
  const font=BLOCK_STYLE.textFont;
  const {ascent,descent}=measureBlockText(b.label,font);
  const centerX=b.x+b.w/2;
  const centerY=b.y+b.h/2;
  const half=(ascent+descent)/2;
  const textY=centerY + (ascent - half);
  ctx.save();
  ctx.font=font;
  ctx.textAlign='center';
  ctx.textBaseline='alphabetic';
  ctx.fillStyle=b.caught?BLOCK_STYLE.caughtText:(b.textColor||BLOCK_STYLE.textColor);
  ctx.fillText(b.label, centerX, textY);
  if(!b.caught && b.glowColor){
    ctx.globalAlpha=0.55;
    ctx.shadowColor=b.glowColor; ctx.shadowBlur=14;
    ctx.fillStyle=b.textColor||BLOCK_STYLE.textColor;
    ctx.fillText(b.label, centerX, textY);
  }
  ctx.restore();
}

/* -------------------- Vanish FX -------------------- */
function spawnPowerupVanishFX(o){
  powerupVanishFX.push({...o,start:performance.now(),duration:POWERUP_VANISH_DURATION});
}
function updateRenderVanishFX(now){
  for(let i=powerupVanishFX.length-1;i>=0;i--){
    const fx=powerupVanishFX[i];
    const t=(now - fx.start)/fx.duration;
    if(t>=1){ powerupVanishFX.splice(i,1); continue; }
    const ease=t*t*(3 - 2*t);
    const scale=1 + (POWERUP_VANISH_SCALE -1)*ease;
    const alpha=1 - t;
    ctx.save();
    ctx.globalAlpha=alpha*0.55;
    ctx.fillStyle=fx.color||'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(fx.x,fx.y,(fx.baseRadius||28)*scale + 6,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=alpha;
    if(fx.imgReady){
      const size=(fx.baseRadius||28)*2*(fx.iconScale||0.7)*scale;
      const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
      ctx.drawImage(fx.img, fx.x - size/2, fx.y - size/2, size, size);
      ctx.imageSmoothingEnabled=prev;
    } else if(fx.label){
      ctx.font=`700 ${Math.round((fx.baseRadius||28)*scale)}px Segoe UI,Inter,sans-serif`;
      ctx.fillStyle='#ffffff';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(fx.label, fx.x, fx.y+2);
    }
    ctx.restore();
  }
}

/* -------------------- Paddle (with lock) -------------------- */
function drawTaskbarPaddle(x,y,width){
  if(!TASKBAR_STYLE?.enabled){
    ctx.fillStyle='#ffffff';
    ctx.fillRect(x,y,DIFFICULTY.paddleWidth,DIFFICULTY.paddleHeight);
    return;
  }
  const s=TASKBAR_STYLE;
  const px=s.pixel;
  const h=Math.max(DIFFICULTY.paddleHeight,s.height);
  const w=width;

  ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle=s.glow;
  ctx.fillRect(x-4,y-6,w+8,h+12); ctx.restore();

  ctx.fillStyle=s.outline;
  ctx.fillRect(x,y,w,h);

  const innerX=x+px, innerY=y+px;
  const innerW=w-2*px, innerH=h-2*px;
  const bandH=Math.floor(innerH/3);
  ctx.fillStyle=s.bgTop; ctx.fillRect(innerX,innerY,innerW,bandH);
  ctx.fillStyle=s.bgMid; ctx.fillRect(innerX,innerY+bandH,innerW,bandH);
  ctx.fillStyle=s.bgBottom; ctx.fillRect(innerX,innerY+bandH*2,innerW,innerH - bandH*2);
  ctx.fillStyle=s.innerLine; ctx.fillRect(innerX,innerY+bandH,innerW,px);

  const iconY=innerY+innerH/2; let cursorX=innerX + s.padX;
  const minSpace=s.iconSize + s.padX;
  const drawStart=()=>{
    const size=s.iconSize; const half=Math.floor(size/2);
    ctx.fillStyle=s.startRed; ctx.fillRect(cursorX,iconY-half,half-1,half-1);
    ctx.fillStyle=s.startGreen; ctx.fillRect(cursorX+half+1,iconY-half,half-1,half-1);
    ctx.fillStyle=s.startBlue; ctx.fillRect(cursorX,iconY+1,half-1,half-1);
    ctx.fillStyle=s.startYellow; ctx.fillRect(cursorX+half+1,iconY+1,half-1,half-1);
    cursorX+=size+s.iconGap;
  };
  const drawSearch=()=>{
    const size=s.iconSize; const r=Math.floor(size/2)-2;
    const cx=cursorX+r+1, cy=iconY;
    ctx.strokeStyle='#b7c4ce'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+r-1,cy+r-1); ctx.lineTo(cx+r+5,cy+r+5); ctx.stroke();
    cursorX+=size+s.iconGap;
  };
  const drawFolder=()=>{
    const size=s.iconSize;
    ctx.fillStyle='#ffcf4d'; ctx.fillRect(cursorX,iconY-size/2+1,size,size-2);
    ctx.fillStyle='#ffe28a'; ctx.fillRect(cursorX+1,iconY-size/2+2,size-2,4);
    cursorX+=size+s.iconGap;
  };
  const drawEdge=()=>{
    const size=s.iconSize; const r=size/2;
    const cx=cursorX+r, cy=iconY;
    const grad=ctx.createRadialGradient(cx,cy-2,2,cx,cy,r);
    grad.addColorStop(0,'#0a84ff'); grad.addColorStop(1,'#0264c8');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(cx,cy,r-1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffff';
    ctx.font='bold 8px Segoe UI,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('e',cx,cy+1);
    cursorX+=size+s.iconGap;
  };

  if(cursorX+minSpace<x+w) drawStart();
  if(cursorX+minSpace<x+w) drawSearch();
  if(cursorX+minSpace<x+w) drawFolder();
  if(cursorX+minSpace<x+w) drawEdge();
}

/* -------------------- Public API -------------------- */
export function showPlayPrompt(){
  const el=document.getElementById('play-prompt');
  el.textContent=infiniteUnlocked
    ? 'Press G to play (boss) or I for Infinite Mode'
    : 'Press G to defend against the update';
  el.style.display='block';
}
export function hidePlayPrompt(){
  const el=document.getElementById('play-prompt');
  if(el) el.style.display='none';
}
export function initGame(){}

/* -------------------- Start / Reset -------------------- */
function internalStartCommon(){
  canvas=document.getElementById('game-canvas');
  ctx=canvas.getContext('2d');
  hudEl=document.getElementById('game-hud');
  overlayEl=document.getElementById('game-overlay');
  msgEl=document.getElementById('game-message');

  resizeCanvas();
  bindGameListeners();

  hidePlayPrompt();
  overlayEl.style.display='block';

  score=0; lives=DIFFICULTY.lives; lifeEverLost=false;
  newHigh=false;
  spawnInterval=DIFFICULTY.baseSpawnInterval;
  blocks=[];
  paddleX=canvas.width/2 - DIFFICULTY.paddleWidth/2;

  bossActive=false; bossHealth=BOSS_CONFIG.health;
  bossDropInterval=BOSS_CONFIG.dropIntervalStart;
  lastBossDrop=0; bossStartTime=0;
  bossDying=false; bossDeathParticles=[];

  lastLifeSpawnScore=0;

  shakeStart=0;
  catchParticles=[]; floatTexts=[]; ringPulses=[]; powerupVanishFX=[];

  const now=performance.now();
  lastBombSpawn=now; nextBombSpawnDelay=BOMB_CONFIG.spawnIntervalInitial;
  lastSnipSpawn=now; nextSnipSpawnDelay=SNIP_POWERUP.spawnIntervalInitial;
  lastShieldSpawn=now; nextShieldSpawnDelay=SHIELD_POWERUP.spawnIntervalInitial;
  lastTaskMgrSpawn=now; nextTaskMgrSpawnDelay=TASKMGR_POWERUP.spawnIntervalInitial;
  lastSoundwaveSpawn=now; nextSoundwaveSpawnDelay=SOUNDWAVE_POWERUP.spawnIntervalInitial;
  lastStickySpawn=now; nextStickySpawnDelay=STICKY_KEYS.spawnIntervalInitial;

  resetSnipState();
  shieldActive=false;
  slowMoActive=false; slowMoFactor=1;
  activeSoundwaveSlowMo=false;
  stickyKeysActive=false; stickyLockX=null;
  stickyLockAnim=null;
  stickyJustUnlocked=false;
  soundwaveJustUnlocked=false;

  infiniteUnlocked = localStorage.getItem(INFINITE_UNLOCK_KEY)==='1';
  soundwaveUnlocked = localStorage.getItem(SOUNDWAVE_UNLOCK_KEY)==='1';
  stickyUnlocked = (localStorage.getItem(STICKY_UNLOCK_KEY)==='1') || infiniteUnlocked;

  nukeTriggered=false;
  gameActive=true;
  gamePaused=false;
  gameStartTime=performance.now();
  lastTs=gameStartTime;
  lastSpawn=gameStartTime;

  msgEl.textContent='';
  msgEl.classList.remove('show');
  if(flashBG._t){ clearTimeout(flashBG._t); flashBG._t=null; }
  overlayEl.style.background=BASE_OVERLAY_BG;

  loadAudioBank();
  loadAllImages();
  loadMusicBank();
  if(!sizeTierCache) precomputeSizeTierWidths();

  playSfx('uiStart');
  playMusic(infiniteMode ? 'infinite' : 'normal', { immediate:true });

  // Start loading WebAudio buffers (non-blocking)
  loadWebAudioBuffers();

  hudDirty=true;
  frameCounter=0;

  perfWindow.length=0;
  perfLastSampleTs=0;
  audioDegradeLevel=0;

  maybeShowTutorial(()=>{ rafId=requestAnimationFrame(gameLoop); });
}
export function startGame(){ infiniteMode=false; internalStartCommon(); }
export function startInfiniteGame(){ infiniteMode=true; internalStartCommon(); }

/* -------------------- Tutorial -------------------- */
function maybeShowTutorial(cb){
  const seen=localStorage.getItem(LS_KEYS.tutorial)==='1';
  if(seen){
    showStartLivesBanner();
    cb&&cb();
    return;
  }
  const panel=document.createElement('div');
  panel.id='tutorial-overlay';
  panel.style.cssText=`position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.55);
    backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;
    font-family:inherit;color:#fff;padding:1.5rem;`;
  panel.innerHTML=`
    <div style="max-width:720px;width:100%;background:rgba(0,46,95,0.9);
      border:1px solid rgba(255,255,255,0.25);padding:1.75rem 2rem;font-size:.95rem;line-height:1.45;">
      <h2 style="margin:0 0 1rem;font-weight:400;font-size:1.4rem;">How to Play</h2>
      <ul style="margin:0 0 1.1rem 1.1rem;list-style:disc;">
        <li>Catch normal blocks; miss = lose life.</li>
        <li>Cortana: adds lives (max ${LIFE_BLOCK.maxLives}).</li>
        <li>Errors: Does damage.</li>
        <li>Snipping Tool: collect then drag an area (desktop) or 1/2 finger drag on touch.</li>
        <li>Shield: temporary immunity.</li>
        <li>Task Manager: rare clear + slow-mo.</li>
        <li>Soundwave: flawless unlock (pulses clear area).</li>
        <li>Sticky Keys: infinite OR score ${STICKY_SCORE_UNLOCK_THRESHOLD}+ (no flawless yet).</li>
        <li><strong>Boss at ${BOSS_CONFIG.triggerScore} points.</strong></li>
      </ul>
      <p style="margin:0 0 1.1rem;">Mouse/Touch, A/← & D/→ move, P pause, Esc exit, G start, I infinite</p>
      <button id="tutorial-start"
        style="background:#fff;color:#003a66;border:0;padding:.6rem 1.2rem;cursor:pointer;
          font:inherit;font-size:.8rem;letter-spacing:.5px;">START</button>
    </div>`;
  document.body.appendChild(panel);
  function close(){
    try{ localStorage.setItem(LS_KEYS.tutorial,'1'); }catch{}
    panel.remove();
    showStartLivesBanner();
    gameStartTime=performance.now();
    lastTs=gameStartTime;
    lastSpawn=gameStartTime;
    rafId=requestAnimationFrame(gameLoop);
    cb&&cb();
  }
  panel.querySelector('#tutorial-start').addEventListener('click',()=>{ playSfx('uiSelect'); close(); });
  window.addEventListener('keydown', function k(e){
    if(['Enter',' '].includes(e.key) || e.key==='Escape'){
      window.removeEventListener('keydown',k);
      playSfx('uiSelect');
      close();
    }
  });
}

/* -------------------- Infinite Unlock -------------------- */
function unlockInfinite(){
  if(!infiniteUnlocked){
    infiniteUnlocked=true;
    try { localStorage.setItem(INFINITE_UNLOCK_KEY,'1'); } catch {}
    if(!stickyUnlocked){
      stickyUnlocked=true;
      stickyJustUnlocked=true;
      try { localStorage.setItem(STICKY_UNLOCK_KEY,'1'); } catch {}
    }
    playSfx('infiniteUnlock');
    markHudDirty();
  }
}

/* -------------------- Alternate Sticky Unlock -------------------- */
function maybeAlternateStickyUnlock(){
  if(!stickyUnlocked &&
     !soundwaveUnlocked &&
     score >= STICKY_SCORE_UNLOCK_THRESHOLD){
    stickyUnlocked=true;
    try{ localStorage.setItem(STICKY_UNLOCK_KEY,'1'); }catch{}
    spawnFloatText(canvas.width/2, canvas.height*0.35,'STICKY KEYS UNLOCKED!','#ffccff',-90,1600,1.4);
    playSfx('stickyHit');
    markHudDirty();
  }
}

/* -------------------- Life Blocks -------------------- */
function maybeSpawnLifeBlock(){
  if(bossActive||bossDying) return;
  if(lives>=LIFE_BLOCK.maxLives) return;
  const interval=infiniteMode?LIFE_BLOCK.infiniteInterval:LIFE_BLOCK.normalInterval;
  if(!interval || score<=0) return;
  if(score % interval !== 0) return;
  if(lastLifeSpawnScore===score) return;
  lastLifeSpawnScore=score;
  spawnLifeBlock();
  markHudDirty();
}
function spawnLifeBlock(){
  loadLifeImage();
  const size=LIFE_BLOCK.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=DIFFICULTY.baseSpeedRange[1]*LIFE_BLOCK.speedMultiplier;
  blocks.push({mode:'life',label:LIFE_BLOCK.label,x,y:-size-8,w:size,h:size,speed,caught:false,created:performance.now()});
}

/* -------------------- Bombs -------------------- */
function maybeSpawnBomb(ts){
  if(!BOMB_CONFIG.enabled) return;
  if(bossActive||bossDying||snipReady) return;
  if(!gameActive) return;
  const elapsed=ts - lastBombSpawn;
  if(elapsed < nextBombSpawnDelay) return;
  const ratio=Math.min(1,score / BOMB_CONFIG.spawnIntervalDecayScore);
  const baseInterval=BOMB_CONFIG.baseSpawnInterval -
    (BOMB_CONFIG.baseSpawnInterval - BOMB_CONFIG.spawnIntervalMin)*ratio;
  let cycles=1;
  if(BOMB_CONFIG.backfillCatchUp){
    cycles=Math.min(4, Math.max(1, Math.floor(elapsed / baseInterval)));
  }
  for(let c=0;c<cycles;c++){ spawnBombBurst(); lastBombSpawn=ts; }
  nextBombSpawnDelay=baseInterval + Math.random()*BOMB_CONFIG.randomJitter;
}
function currentActiveBombs(){ return blocks.filter(b=>b.mode==='bomb' && !b._remove).length; }
function spawnBombBurst(){
  if(currentActiveBombs() >= BOMB_CONFIG.maxConcurrent) return;

  // Always spawn at least one
  spawnBomb();

  const ratio  = Math.min(1, score / (BOMB_CONFIG.scoreRampForMulti || 1));
  const chance = BOMB_CONFIG.multiSpawnChanceBase + ratio * BOMB_CONFIG.multiSpawnChanceScoreBoost;
  let extra = 0;
  while(extra < BOMB_CONFIG.multiSpawnMax){
    if(currentActiveBombs() >= BOMB_CONFIG.maxConcurrent) break;
    if(Math.random() < chance){
      spawnBomb();
      extra++;
    } else break;
  }
  const totalSpawned = 1 + extra;

  // AUDIO OPTIMIZATION:
  // On mobile: single volume‑scaled sound (no echoes, no timers).
  if (IS_MOBILE){
    const volScale = Math.min(1, 0.55 + 0.12 * totalSpawned); // linear-ish growth
    playSfx('bombSpawn', { allowOverlap:true, volumeScale:volScale });
    return;
  }

  // Desktop / non-mobile:
  // Keep echo flavor but cap echoes to reduce timers (max 3).
  playSfx('bombSpawn', { allowOverlap:true, volumeScale:1 });
  const MAX_ECHOES = 3;
  const echoes = Math.min(MAX_ECHOES, totalSpawned - 1);
  if(echoes <= 0) return;

  const delayStepMs = 40;
  const falloffPer  = 0.25;
  const minVolume   = 0.15;

  for(let i=1; i<=echoes; i++){
    const atten=Math.max(minVolume, 1 - i*falloffPer);
    setTimeout(()=> playSfx('bombSpawn',{allowOverlap:true, volumeScale:atten}), i*delayStepMs);
  }
}
function spawnBomb(){
  loadBombImage();
  const size=BOMB_CONFIG.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(...BOMB_CONFIG.speedRange);
  blocks.push({
    mode:'bomb',
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now(),
    lastSpark:performance.now(),
    exploding:false,
    explodeStart:0,
    shards:[]
  });
}

/* -------------------- Sticky Keys -------------------- */
function maybeSpawnSticky(ts){
  if(!stickyUnlocked) return;
  if(!STICKY_KEYS.enabled) return;
  if(bossActive||bossDying||snipReady) return;
  if(!gameActive) return;
  const elapsed=ts - lastStickySpawn;
  if(elapsed < nextStickySpawnDelay) return;
  const ratio=Math.min(1, score / STICKY_KEYS.spawnIntervalDecayScore);
  const baseI=STICKY_KEYS.baseSpawnInterval -
    (STICKY_KEYS.baseSpawnInterval - STICKY_KEYS.spawnIntervalMin)*ratio;
  let cycles=1;
  if(STICKY_KEYS.backfillCatchUp){
    cycles=Math.min(3, Math.max(1, Math.floor(elapsed/baseI)));
  }
  if(cycles>0){
    spawnSticky();
    lastStickySpawn=ts;
  }
  nextStickySpawnDelay=baseI + Math.random()*STICKY_KEYS.randomJitter;
}
function countActiveSticky(){
  return blocks.filter(b=>b.mode==='sticky' && !b.caught).length;
}
function spawnSticky(){
  if(countActiveSticky() >= STICKY_KEYS.maxConcurrent) return;
  loadStickyImage();
  const size=STICKY_KEYS.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(...STICKY_KEYS.speedRange);
  blocks.push({
    mode:'sticky',
    label:STICKY_KEYS.label,
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now()
  });
  playSfx('stickySpawn');
}
function handleStickyHit(){
  const now=performance.now();
  if(stickyKeysActive){
    stickyKeysEnd=now + STICKY_KEYS.durationMs;
    if(stickyLockAnim){
      stickyLockAnim.phase='pulse';
      stickyLockAnim.pulseUntil=now + 400;
    }
    spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2, canvas.height - 130,'STICKINESS EXTENDED','#ffd1ff', -60, 900, 1.05);
    return;
  }
  stickyKeysActive=true;
  stickyKeysEnd=now + STICKY_KEYS.durationMs;
  stickyLockX=paddleX;
  playSfx('stickyHit');
  spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2, canvas.height - 130,'STICKY TASKBAR','#ffb8ff', -70, 1100, 1.2);
  triggerShake(10,300,'all');
  stickyLockAnim={
    phase:'enter',
    start:now,
    lockX:paddleX + DIFFICULTY.paddleWidth/2,
    lockY:canvas.height - 90 - (STICKY_KEYS.lockYOffset || 30)
  };
  markHudDirty();
}
function maybeEndSticky(){
  if(!stickyKeysActive) return;
  const now=performance.now();
  if(now > stickyKeysEnd){
    if(stickyLockAnim && stickyLockAnim.phase!=='exit'){
      stickyLockAnim.phase='exit';
      stickyLockAnim.start=now;
    }
    stickyKeysActive=false;
    stickyLockX=null;
    playSfx('stickyEnd');
    spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2,
      canvas.height - 120,'TASKBAR UNSTUCK','#cccccc', -60, 900, 1);
    markHudDirty();
  }
}

/* -------------------- SNIP -------------------- */
function maybeSpawnSnip(ts){
  if(!SNIP_POWERUP.enabled) return;
  if(bossActive||bossDying||snipReady) return;
  if(!gameActive) return;
  if(countActiveSnipPowerups()>=SNIP_POWERUP.maxConcurrent) return;
  const elapsed=ts - lastSnipSpawn;
  if(elapsed < nextSnipSpawnDelay) return;
  const ratio=Math.min(1, score / SNIP_POWERUP.spawnIntervalDecayScore);
  const baseI=SNIP_POWERUP.baseSpawnInterval -
    (SNIP_POWERUP.baseSpawnInterval - SNIP_POWERUP.spawnIntervalMin)*ratio;
  let cycles=1;
  if(SNIP_POWERUP.backfillCatchUp){
    cycles=Math.min(3, Math.max(1, Math.floor(elapsed/baseI)));
  }
  if(cycles>0){ spawnSnipPowerup(); lastSnipSpawn=ts; }
  nextSnipSpawnDelay=baseI + Math.random()*SNIP_POWERUP.randomJitter;
}
function countActiveSnipPowerups(){ return blocks.filter(b=>b.mode==='snip' && !b.caught).length; }
function spawnSnipPowerup(){
  loadSnipImage();
  const size=SNIP_POWERUP.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(140,260);
  blocks.push({
    mode:'snip',
    label:SNIP_POWERUP.label,
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now()
  });
  playSfx('snipSpawn');
}
function resetSnipState(){
  snipReady=false; snipAimStart=0;
  snipDragging=false; snipDragStarted=false;
  snipRect=null; snipDragOrigin=null;
  snipExecuted=false;
  snipMultiTouch=false;
  markHudDirty();
}
function beginSnipReady(){
  snipReady=true;
  snipAimStart=performance.now();
  snipDragOrigin=null;
  snipRect=null;
  snipDragging=false;
  snipDragStarted=false;
  snipExecuted=false;
  snipMultiTouch=false;
  playSfx('snipPickup');
  markHudDirty();
}
function executeSnip(rect){
  if(!rect) return;
  snipExecuted=true;
  playSfx('snipExecute');
  if(SNIP_POWERUP.screenShakeOnExecute){
    triggerShake(SNIP_POWERUP.executeShakeIntensity,SNIP_POWERUP.executeShakeDuration,'all');
  }
  const rx=rect.x, ry=rect.y, rw=rect.w, rh=rect.h;
  const now=performance.now();

  let normalCleared=0, bombsTouched=0;
  let shieldCollected=false, taskMgrCollected=false, lifeCollectedCount=0;
  let soundwaveCollected=false;

  for(let i=blocks.length-1;i>=0;i--){
    const b=blocks[i];
    if(b.caught) continue;
    if(b.mode==='bossHazard') continue;
    if(b.mode==='snip' && snipReady && !b.caught) continue;
    if(!intersectRect(rx,ry,rw,rh,b.x,b.y,b.w,b.h)) continue;

    switch(b.mode){
      case 'normal':
        normalCleared++;
        score += SNIP_POWERUP.awardScorePerNormal;
        spawnCatchParticles(b.x+b.w/2,b.y+b.h/2,'#ff9de0',12);
        spawnFloatText(b.x+b.w/2,b.y+b.h/2,'+'+SNIP_POWERUP.awardScorePerNormal,'#ff8ed7',-50,900,1);
        blocks.splice(i,1);
        break;
      case 'bomb':
        if(!SNIP_POWERUP.allowBombRemoval) break;
        bombsTouched++;
        if(SNIP_POWERUP.bombTriggersExplosion){
          if(!b.exploding){
            b.exploding=true;
            b.explodeStart=now;
            spawnBombShards(b);
            spawnRingPulse(b.x+b.w/2,b.y+b.h/2,'rgba(255,110,60,0.55)',90,500);
            playSfx('bombExplode');
          }
        } else {
          blocks.splice(i,1);
        }
        break;
      case 'life': {
        const cx=b.x+b.w/2, cy=b.y+b.h/2;
        spawnPowerupVanishFX({
          x:cx,y:cy,img:lifeImg,imgReady:lifeImgReady,
          label:LIFE_BLOCK.label,color:LIFE_BLOCK.glowColor,
          iconScale:LIFE_BLOCK.iconScale,baseRadius:b.w/2
        });
        if(lives < LIFE_BLOCK.maxLives){
          lives++; lifeCollectedCount++;
          spawnFloatText(cx,cy-10,'+1 LIFE','#20d672',-60,1000,1.05);
          spawnCatchParticles(cx,cy,'#20d672',14);
        } else {
          spawnFloatText(cx,cy-10,'MAX','#cccccc',-50,900,1);
        }
        blocks.splice(i,1);
        break;
      }
      case 'shield': {
        const cx=b.x+b.w/2, cy=b.y+b.h/2;
        spawnPowerupVanishFX({
          x:cx,y:cy,img:shieldImg,imgReady:shieldImgReady,
          label:b.label,color:SHIELD_POWERUP.glow,
          iconScale:SHIELD_POWERUP.iconScale,baseRadius:b.w/2
        });
        shieldCollected=true;
        blocks.splice(i,1);
        break;
      }
      case 'taskmgr': {
        const cx=b.x+b.w/2, cy=b.y+b.h/2;
        spawnPowerupVanishFX({
          x:cx,y:cy,img:taskMgrImg,imgReady:taskMgrImgReady,
          label:b.label,color:TASKMGR_POWERUP.glow,
          iconScale:TASKMGR_POWERUP.iconScale,baseRadius:b.w/2
        });
        taskMgrCollected=true;
        blocks.splice(i,1);
        break;
      }
      case 'soundwave': {
        const cx=b.x+b.w/2, cy=b.y+b.h/2;
        spawnPowerupVanishFX({
          x:cx,y:cy,img:soundwaveImg,imgReady:soundwaveImgReady,
          label:b.label,color:SOUNDWAVE_POWERUP.glow,
          iconScale:SOUNDWAVE_POWERUP.iconScale,baseRadius:b.w/2
        });
        soundwaveCollected=true;
        blocks.splice(i,1);
        break;
      }
      case 'sticky': {
        const cx=b.x+b.w/2, cy=b.y+b.h/2;
        spawnPowerupVanishFX({
          x:cx,y:cy,img:stickyImg,imgReady:stickyImgReady,
            label:b.label,color:'rgba(255,255,255,0.35)',
          iconScale:STICKY_KEYS.iconScale,baseRadius:b.w/2
        });
        blocks.splice(i,1);
        break;
      }
      default: break;
    }
  }

  if(!normalCleared && !bombsTouched && !lifeCollectedCount && !shieldCollected && !taskMgrCollected && !soundwaveCollected){
    spawnFloatText(rect.x+rect.w/2, rect.y+rect.h/2,'NO TARGETS','#bcbcbc',-60,850,1);
  } else {
    const ringColor =
      soundwaveCollected ? 'rgba(160,120,255,0.55)' :
      taskMgrCollected ? 'rgba(255,210,90,0.55)' :
      shieldCollected   ? 'rgba(120,200,255,0.55)' :
      lifeCollectedCount? 'rgba(32,214,114,0.55)' :
      'rgba(255,63,177,0.40)';
    spawnRingPulse(rect.x+rect.w/2, rect.y+rect.h/2,
      ringColor, Math.min(260, Math.max(rect.w,rect.h)*0.9), 750);
  }

  if(shieldCollected) activateShield();
  if(taskMgrCollected) activateTaskManager();
  if(soundwaveCollected){
    playSfx('soundwavePickup');
    activateSoundwave(rect.x+rect.w/2, rect.y+rect.h/2);
  }

  resetSnipState();
  markHudDirty();
}
function cancelSnip(){
  if(!snipReady) return;
  playSfx('snipCancel');
  spawnFloatText(canvas.width/2, canvas.height*0.4,'SNIP CANCELED','#ff6f9f',-80,1000,1.1);
  resetSnipState();
}

/* -------------------- Shield -------------------- */
function maybeSpawnShield(ts){
  if(!SHIELD_POWERUP.enabled) return;
  if(bossActive||bossDying||shieldActive) return;
  if(!gameActive) return;
  if(countActiveShieldPowerups()>=SHIELD_POWERUP.maxConcurrent) return;
  const elapsed=ts - lastShieldSpawn;
  if(elapsed < nextShieldSpawnDelay) return;
  const ratio=Math.min(1, score / SHIELD_POWERUP.spawnIntervalDecayScore);
  const baseI=SHIELD_POWERUP.baseSpawnInterval -
    (SHIELD_POWERUP.baseSpawnInterval - SHIELD_POWERUP.spawnIntervalMin)*ratio;
  let cycles=1;
  if(SHIELD_POWERUP.backfillCatchUp){
    cycles=Math.min(3, Math.max(1, Math.floor(elapsed/baseI)));
  }
  if(cycles>0){ spawnShieldPowerup(); lastShieldSpawn=ts; }
  nextShieldSpawnDelay=baseI + Math.random()*SHIELD_POWERUP.randomJitter;
}
function countActiveShieldPowerups(){ return blocks.filter(b=>b.mode==='shield' && !b.caught).length; }
function spawnShieldPowerup(){
  loadShieldImage();
  const size=SHIELD_POWERUP.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(150,280);
  blocks.push({
    mode:'shield',
    label:SHIELD_POWERUP.label,
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now()
  });
  playSfx('shieldSpawn');
}
function activateShield(){
  const extending=shieldActive;
  shieldActive=true;
  shieldEndTime=performance.now() + SHIELD_POWERUP.durationMs;
  playSfx('shieldPickup');
  spawnRingPulse(paddleX + DIFFICULTY.paddleWidth/2,
                 canvas.height - 90 + DIFFICULTY.paddleHeight/2,
                 'rgba(90,190,255,0.6)',180,800);
  spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2,
    canvas.height - 140,
    extending?'SHIELD REFRESH':'SHIELD ON',
    '#64c9ff', -80, 1200, 1.1);
  markHudDirty();
}
function maybeExpireShield(){
  if(shieldActive && performance.now() >= shieldEndTime){
    shieldActive=false;
    playSfx('shieldExpire');
    spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2,
      canvas.height - 140,'SHIELD OFF','#9fb6c2',-70,1000,1);
    markHudDirty();
  }
}
function renderShieldAura(){
  if(!shieldActive) return;
  const t=(performance.now()%1000)/1000;
  const pulse=0.6 + 0.4*Math.sin(t * SHIELD_POWERUP.auraPulseSpeed * Math.PI*2);
  const px=paddleX + DIFFICULTY.paddleWidth/2;
  const py=canvas.height - 90 + DIFFICULTY.paddleHeight/2;
  const radius=Math.max(DIFFICULTY.paddleWidth,130)*0.5 +
    SHIELD_POWERUP.auraRadiusExtra*(0.7 + 0.3*pulse);

  ctx.save(); ctx.globalAlpha=0.55;
  ctx.strokeStyle=SHIELD_POWERUP.auraTrailColor;
  ctx.lineWidth=10; ctx.beginPath();
  ctx.arc(px,py,radius+8,0,Math.PI*2); ctx.stroke(); ctx.restore();

  ctx.save(); ctx.globalAlpha=0.9;
  ctx.strokeStyle=SHIELD_POWERUP.auraColor;
  ctx.lineWidth=4 + 2*pulse;
  ctx.beginPath(); ctx.arc(px,py,radius,0,Math.PI*2); ctx.stroke(); ctx.restore();

  ctx.save(); ctx.globalAlpha=0.15*pulse;
  ctx.fillStyle=SHIELD_POWERUP.overlayFlashColor;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
}

/* -------------------- Task Manager -------------------- */
function maybeSpawnTaskMgr(ts){
  if(!TASKMGR_POWERUP.enabled) return;
  if(bossActive||bossDying) return;
  if(!gameActive) return;
  if(countActiveTaskMgr()>=TASKMGR_POWERUP.maxConcurrent) return;
  const elapsed=ts - lastTaskMgrSpawn;
  if(elapsed < nextTaskMgrSpawnDelay) return;
  const ratio=Math.min(1, score / TASKMGR_POWERUP.spawnIntervalDecayScore);
  const baseI=TASKMGR_POWERUP.baseSpawnInterval -
    (TASKMGR_POWERUP.baseSpawnInterval - TASKMGR_POWERUP.spawnIntervalMin)*ratio;
  let cycles=1;
  if(TASKMGR_POWERUP.backfillCatchUp){
    cycles=Math.min(2, Math.max(1, Math.floor(elapsed/baseI)));
  }
  if(cycles>0){ spawnTaskMgrPowerup(); lastTaskMgrSpawn=ts; }
  nextTaskMgrSpawnDelay=baseI + Math.random()*TASKMGR_POWERUP.randomJitter;
}
function countActiveTaskMgr(){ return blocks.filter(b=>b.mode==='taskmgr' && !b.caught).length; }
function spawnTaskMgrPowerup(){
  loadTaskMgrImage();
  const size=TASKMGR_POWERUP.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(130,240);
  blocks.push({
    mode:'taskmgr',
    label:TASKMGR_POWERUP.label,
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now()
  });
  playSfx('taskmgrSpawn');
}
function activateTaskManager(){
  playSfx('taskmgrPickup'); playSfx('taskmgrExecute');
  spawnRingPulse(canvas.width/2,canvas.height/2,TASKMGR_POWERUP.glow,TASKMGR_POWERUP.ringRadius,900);
  if(TASKMGR_POWERUP.globalFlash) flashBG(TASKMGR_POWERUP.globalFlash);
  if(TASKMGR_POWERUP.screenShake)
    triggerShake(TASKMGR_POWERUP.shakeIntensity,TASKMGR_POWERUP.shakeDuration,'all');

  let clearedNormal=0;
  const now=performance.now();
  for(let i=blocks.length-1;i>=0;i--){
    const b=blocks[i];
    if(['life','snip','shield','taskmgr','soundwave','sticky','bossHazard'].includes(b.mode)) continue;
    if(b.mode==='normal'){
      clearedNormal++;
      score+=TASKMGR_POWERUP.awardScorePerNormal;
      spawnCatchParticles(b.x+b.w/2,b.y+b.h/2,'#ffd24d',14);
      spawnFloatText(b.x+b.w/2,b.y+b.h/2,'+'+TASKMGR_POWERUP.awardScorePerNormal,'#ffdf80',-60,850,1);
      blocks.splice(i,1);
      continue;
    }
    if(b.mode==='bomb' && TASKMGR_POWERUP.affectBombs){
      if(TASKMGR_POWERUP.bombExplode){
        if(!b.exploding){
          b.exploding=true; b.explodeStart=now;
          spawnBombShards(b);
          spawnRingPulse(b.x+b.w/2,b.y+b.h/2,'rgba(255,140,50,0.55)',90,520);
          playSfx('bombExplode');
        }
      } else {
        blocks.splice(i,1);
      }
    }
  }
  spawnFloatText(canvas.width/2,canvas.height/2 - 40,
    clearedNormal?`TASK MANAGER: Cleared ${clearedNormal}`:'TASK MANAGER: No Blocks',
    '#ffe684', -90, 1400, 1.15);

  if(TASKMGR_POWERUP.slowMoEnabled){
    slowMoActive=true;
    slowMoFactor=TASKMGR_POWERUP.slowMoFactor;
    slowMoEnd=performance.now() + TASKMGR_POWERUP.slowMoDurationMs;
  }
  markHudDirty();
}

/* -------------------- Soundwave -------------------- */
function maybeSpawnSoundwave(ts){
  if(!SOUNDWAVE_POWERUP.enabled) return;
  if(!soundwaveUnlocked) return;
  if(bossActive||bossDying||snipReady) return;
  if(!gameActive) return;
  if(countActiveSoundwave()>=SOUNDWAVE_POWERUP.maxConcurrent) return;
  const elapsed=ts - lastSoundwaveSpawn;
  if(elapsed < nextSoundwaveSpawnDelay) return;
  const ratio=Math.min(1, score / SOUNDWAVE_POWERUP.spawnIntervalDecayScore);
  const baseI=SOUNDWAVE_POWERUP.baseSpawnInterval -
    (SOUNDWAVE_POWERUP.baseSpawnInterval - SOUNDWAVE_POWERUP.spawnIntervalMin)*ratio;
  let cycles=1;
  if(SOUNDWAVE_POWERUP.backfillCatchUp){
    cycles=Math.min(2, Math.max(1, Math.floor(elapsed/baseI)));
  }
  if(cycles>0){
    spawnSoundwavePowerup();
    lastSoundwaveSpawn=ts;
  }
  nextSoundwaveSpawnDelay=baseI + Math.random()*SOUNDWAVE_POWERUP.randomJitter;
}
function countActiveSoundwave(){ return blocks.filter(b=>b.mode==='soundwave' && !b.caught).length; }
function spawnSoundwavePowerup(){
  loadSoundwaveImage();
  const size=SOUNDWAVE_POWERUP.size;
  const x=Math.random()*(canvas.width - size - 80)+40;
  const speed=randBetween(150,260);
  blocks.push({
    mode:'soundwave',
    label:SOUNDWAVE_POWERUP.label,
    x,y:-size-10,
    w:size,h:size,
    speed,
    caught:false,
    created:performance.now()
  });
  playSfx('soundwaveSpawn');
}
function activateSoundwave(cx,cy){
  if(SOUNDWAVE_POWERUP.slowMoEnabled){
    activeSoundwaveSlowMo=true;
    activeSoundwaveSlowMoEnd=performance.now()+SOUNDWAVE_POWERUP.slowMoDurationMs;
  }
  for(let i=0;i<SOUNDWAVE_POWERUP.pulses;i++){
    setTimeout(()=>{
      playSfx('soundwavePulse',{allowOverlap:true});
      const radius=SOUNDWAVE_POWERUP.firstRadius + i*SOUNDWAVE_POWERUP.radiusGrowth;
      spawnRingPulse(cx,cy,SOUNDWAVE_POWERUP.ringColor,radius,520);
      if(SOUNDWAVE_POWERUP.screenShakeEachPulse)
        triggerShake(SOUNDWAVE_POWERUP.shakeIntensity,SOUNDWAVE_POWERUP.shakeDuration,'all');
      const now=performance.now();
      for(let j=blocks.length-1;j>=0;j--){
        const b=blocks[j];
        if(b.caught) continue;
        if(['life','shield','snip','taskmgr','soundwave','sticky','bossHazard'].includes(b.mode)) continue;
        const bx=b.x + b.w/2, by=b.y + b.h/2;
        const dist=Math.hypot(bx - cx, by - cy);
        if(dist <= radius){
          if(b.mode==='normal'){
            score+=SOUNDWAVE_POWERUP.awardScorePerNormal;
            spawnCatchParticles(bx,by,'#c7b0ff',10);
            spawnFloatText(bx,by,'+'+SOUNDWAVE_POWERUP.awardScorePerNormal,'#d9c4ff',-55,850,1);
            blocks.splice(j,1);
          } else if(b.mode==='bomb' && SOUNDWAVE_POWERUP.affectBombs){
            if(SOUNDWAVE_POWERUP.bombExplode){
              if(!b.exploding){
                b.exploding=true; b.explodeStart=now;
                spawnBombShards(b);
                spawnRingPulse(bx,by,'rgba(255,110,60,0.4)',90,480);
                playSfx('bombExplode');
              }
            } else {
              blocks.splice(j,1);
            }
          }
        }
      }
      markHudDirty();
    }, i * SOUNDWAVE_POWERUP.pulseIntervalMs);
  }
}

/* -------------------- Sticky Lock Render -------------------- */
function renderStickyLockAnim(){
  if (!stickyLockAnim) return;
  const now = performance.now();
  const phase = stickyLockAnim.phase;
  const enterDur = 450;
  const exitDur = 450;

  let scale = 1;
  let alpha = 1;
  let shackleOpen = 0;
  let rot = 0;

  if (phase === 'enter') {
    const t = Math.min(1, (now - stickyLockAnim.start) / enterDur);
    const s = 1.70158;
    const eased = 1 + s * Math.pow(t - 1, 3) + (s + 1) * Math.pow(t - 1, 2);
    scale = 0.4 + 0.6 * eased;
    alpha = eased;
    if (t >= 1) {
      stickyLockAnim.phase = 'idle';
      stickyLockAnim.start = now;
    }
  } else if (phase === 'idle') {
    const t = (now - stickyLockAnim.start)/1000;
    scale = 1 + Math.sin(t * 2 * Math.PI * 0.75)*0.06;
  } else if (phase === 'pulse') {
    const remain = (stickyLockAnim.pulseUntil || 0) - now;
    if (remain <= 0) {
      stickyLockAnim.phase = 'idle';
      stickyLockAnim.start = now;
    } else {
      const p = remain / 400;
      scale = 1 + 0.25*(1 - p);
    }
  } else if (phase === 'exit') {
    const t = Math.min(1,(now - stickyLockAnim.start)/exitDur);
    const eased = t*t;
    scale = 1 + 0.2*eased;
    alpha = 1 - eased;
    shackleOpen = eased;
    rot = eased * 0.6;
    if (t >= 1) {
      stickyLockAnim = null;
      return;
    }
  }

  const hasClosed = stickyLockImgClosedReady;
  const hasOpen = stickyLockImgOpenReady;

  const x = stickyLockAnim.lockX;
  const y = stickyLockAnim.lockY;

  const baseScale = STICKY_KEYS.lockBaseScale ?? 1;
  const drawW = STICKY_KEYS.lockDrawWidth || 64;
  const drawH = STICKY_KEYS.lockDrawHeight || 64;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * baseScale, scale * baseScale);
  ctx.globalAlpha = alpha;
  ctx.rotate(rot);

  if (hasClosed && (phase !== 'exit' || !hasOpen)) {
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(stickyLockImgClosed, -drawW/2, -drawH/2, drawW, drawH);
    ctx.imageSmoothingEnabled=prevSmooth;
  } else if (phase === 'exit' && hasClosed && hasOpen) {
    const t = Math.min(1,(now - stickyLockAnim.start)/exitDur);
    const eased = t*t;
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha = (1 - eased) * alpha;
    ctx.drawImage(stickyLockImgClosed, -drawW/2, -drawH/2, drawW, drawH);
    ctx.globalAlpha = eased * alpha;
    ctx.drawImage(stickyLockImgOpen, -drawW/2, -drawH/2, drawW, drawH);
    ctx.imageSmoothingEnabled=prevSmooth;
  } else if (hasOpen && phase === 'exit') {
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(stickyLockImgOpen, -drawW/2, -drawH/2, drawW, drawH);
    ctx.imageSmoothingEnabled=prevSmooth;
  } else {
    const bodyW=48, bodyH=40, bodyR=8;
    ctx.fillStyle='rgba(40,40,55,0.9)';
    roundedRect(ctx,-bodyW/2,-bodyH/2,bodyW,bodyH,bodyR);
    ctx.strokeStyle='#b6b6c8'; ctx.lineWidth=2; ctx.stroke();
    ctx.save();
    ctx.fillStyle='#e4e4f2';
    ctx.beginPath(); ctx.arc(0,2,5,0,Math.PI*2); ctx.fill();
    ctx.fillRect(-2,6,4,10);
    ctx.restore();
    ctx.save();
    const shackleAngle = -Math.PI/3 * shackleOpen;
    ctx.translate(0,-bodyH/2);
    ctx.rotate(shackleAngle);
    ctx.translate(0,-15+4);
    ctx.lineWidth=8;
    ctx.strokeStyle='#d6d6e8';
    ctx.beginPath();
    ctx.arc(0,15,21,Math.PI*1.05,Math.PI*1.95);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.25 * alpha;
  ctx.fillStyle='#bfa8ff';
  ctx.beginPath();
  ctx.arc(0,6,(drawW*0.85),0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/* -------------------- Intersection & Shake -------------------- */
function intersectRect(x1,y1,w1,h1,x2,y2,w2,h2){
  return !(x2 > x1 + w1 || x2 + w2 < x1 || y2 > y1 + h1 || y2 + h2 < y1);
}
function triggerShake(intensity,duration,mode='all'){
  shakeIntensity=intensity;
  shakeDuration=duration;
  shakeStart=performance.now();
  shakeMode=mode;
}

/* -------------------- Boss Death Animation -------------------- */
function startBossDeathAnimation(){
  bossDying=true;
  bossDeathStart=performance.now();
  bossDeathParticles=[];
  spawnBossDeathParticles();
  triggerShake(SHAKE_DEATH_INTENSITY,SHAKE_DEATH_DURATION,'all');
  playSfx('bossDeath');
  markHudDirty();
}
function spawnBossDeathParticles(){
  const box={x:canvas.width/2 - BOSS_CONFIG.width/2,y:BOSS_CONFIG.topY,
    w:BOSS_CONFIG.width,h:BOSS_CONFIG.height};
  for(let i=0;i<BOSS_DEATH_PARTICLE_COUNT;i++){
    const px=box.x + Math.random()*box.w;
    const py=box.y + Math.random()*box.h;
    const size=randBetween(...BOSS_DEATH_PARTICLE_SIZE);
    const speed=randBetween(...BOSS_DEATH_PARTICLE_SPEED);
    const ang=Math.random()*Math.PI*2;
    const vx=Math.cos(ang)*speed;
    const vy=Math.sin(ang)*speed - randBetween(40,120);
    const spin=randBetween(...BOSS_DEATH_PARTICLE_SPIN);
    bossDeathParticles.push({
      x:px,y:py,w:size,h:size,vx,vy,rot:0,spin,
      born:performance.now(),
      life:BOSS_DEATH_PARTICLE_LIFE,
      col:Math.random()<0.3?'#0078d7':'#ffffff'
    });
  }
}
function drawBossDeathParticles(dt){
  const now=performance.now();
  for(let i=bossDeathParticles.length-1;i>=0;i--){
    const p=bossDeathParticles[i];
    const age=now - p.born;
    if(age>p.life){ bossDeathParticles.splice(i,1); continue; }
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.rot += p.spin*dt;
    const fade=1 - age/p.life;
    ctx.save(); ctx.globalAlpha=fade;
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot*Math.PI/180);
    ctx.fillStyle=p.col;
    ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    ctx.restore();
  }
}
function updateBossDeathAnimation(ts){
  const elapsed=ts - bossDeathStart;
  const progress=Math.min(1, elapsed / BOSS_DEATH_DURATION);
  const flashOn=Math.floor(elapsed / BOSS_DEATH_FLASH_FREQ)%2===0;
  const shrink=1 - 0.65*progress;
  const boxX=canvas.width/2 - BOSS_CONFIG.width/2;
  ctx.clearRect(boxX-4,BOSS_CONFIG.topY-50,
    BOSS_CONFIG.width+8,BOSS_CONFIG.height+120);
  if(progress<0.98){
    ctx.save();
    ctx.translate(canvas.width/2,BOSS_CONFIG.topY + BOSS_CONFIG.height/2);
    ctx.fillStyle=flashOn?'#ffffff':'#dfe9ff';
    roundedRect(ctx,
      -(BOSS_CONFIG.width*shrink)/2,
      -(BOSS_CONFIG.height*shrink)/2,
      BOSS_CONFIG.width*shrink,
      BOSS_CONFIG.height*shrink,
      24*shrink);
    ctx.restore();
  }
  const dt=(ts - lastTs)/1000;
  drawBossDeathParticles(dt);
  if(elapsed>=BOSS_DEATH_DURATION && bossDeathParticles.length===0){
    ctx.clearRect(boxX-6,BOSS_CONFIG.topY-60,BOSS_CONFIG.width+12,BOSS_CONFIG.height+140);
    bossDying=false;
    playSfx('bossDeathFinal');
    endGame(true);
  }
}

/* -------------------- FX Helpers -------------------- */
const MAX_CATCH_PARTICLES = 1600;
function spawnCatchParticles(cx,cy,baseColor,count=CATCH_PARTICLE_COUNT_BASE){
  for(let i=0;i<count;i++){
    if(catchParticles.length >= MAX_CATCH_PARTICLES) break;
    const ang=Math.random()*Math.PI*2;
    const spd=randBetween(60,180);
    catchParticles.push({
      x:cx,y:cy,
      vx:Math.cos(ang)*spd,
      vy:Math.sin(ang)*spd - randBetween(20,60),
      size:randBetween(3,7),
      color:baseColor,
      life:0,
      maxLife:550 + Math.random()*350
    });
  }
}
const MAX_FLOAT_TEXT = 180;
function spawnFloatText(x,y,text,color='#ffffff',rise=-50,dur=900,scale=1){
  if(floatTexts.length >= MAX_FLOAT_TEXT){
    floatTexts.shift();
  }
  floatTexts.push({x,y,vy:rise/dur,text,color,life:0,maxLife:dur,scale});
}
function spawnRingPulse(x,y,color='rgba(32,214,114,0.55)',radius=LIFE_PULSE_RADIUS,dur=600){
  ringPulses.push({x,y,rFrom:8,rTo:radius,life:0,maxLife:dur,color,alphaFrom:.65,alphaTo:0});
}
function updateAndRenderFX(dtMs){
  for(let i=catchParticles.length-1;i>=0;i--){
    const p=catchParticles[i];
    p.life+=dtMs;
    if(p.life>p.maxLife){ catchParticles.splice(i,1); continue; }
    const t=p.life/p.maxLife;
    p.x+=p.vx*(dtMs/1000);
    p.y+=p.vy*(dtMs/1000);
    p.vy+=120*(dtMs/1000);
    ctx.save(); ctx.globalAlpha=1 - t;
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(1-0.5*t),0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  for(let i=floatTexts.length-1;i>=0;i--){
    const f=floatTexts[i];
    f.life+=dtMs;
    if(f.life>f.maxLife){ floatTexts.splice(i,1); continue; }
    f.y+=f.vy*dtMs;
    const t=f.life/f.maxLife;
    ctx.save(); ctx.globalAlpha=1 - t;
    ctx.fillStyle=f.color;
    ctx.font=`600 ${14*f.scale}px Segoe UI,Inter,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(f.text,f.x,f.y);
    ctx.restore();
  }
  for(let i=ringPulses.length-1;i>=0;i--){
    const r=ringPulses[i];
    r.life+=dtMs;
    if(r.life>r.maxLife){ ringPulses.splice(i,1); continue; }
    const t=r.life/r.maxLife;
    const radius=r.rFrom + (r.rTo - r.rFrom)*t;
    const alpha=r.alphaFrom + (r.alphaTo - r.alphaFrom)*t;
    ctx.save();
    ctx.strokeStyle=r.color;
    ctx.globalAlpha=alpha;
    ctx.lineWidth=6*(1 - t);
    ctx.beginPath(); ctx.arc(r.x,r.y,radius,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}

/* -------------------- Bomb Explosion -------------------- */
function drawBomb(b,now){
  if(b.exploding){ drawBombExplosion(b,now); return; }
  const t=(now - b.created)/1000;
  const pulse=0.85 + 0.15*Math.sin(t * BOMB_CONFIG.pulseSpeed*Math.PI);
  const rBase=b.w/2;
  const r=rBase*pulse;
  ctx.save();
  ctx.translate(b.x + rBase, b.y + rBase);
  if(bombImgReady){
    ctx.save(); ctx.globalAlpha=0.35;
    ctx.fillStyle=BOMB_CONFIG.colorGlow;
    ctx.beginPath(); ctx.arc(0,0,r+8,0,Math.PI*2); ctx.fill(); ctx.restore();
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(bombImg,-r,-r,r*2,r*2);
    ctx.imageSmoothingEnabled=prev;
  } else {
    ctx.fillStyle=BOMB_CONFIG.colorBody;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.lineWidth=3; ctx.strokeStyle=BOMB_CONFIG.colorOutline; ctx.stroke();
    ctx.globalAlpha=0.25; ctx.fillStyle=BOMB_CONFIG.colorGlow;
    ctx.beginPath(); ctx.arc(0,0,r+6,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }
  const fuseLen=14;
  ctx.strokeStyle=BOMB_CONFIG.colorFuse;
  ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,-r+4); ctx.lineTo(0,-r - fuseLen); ctx.stroke();
  if(now - b.lastSpark > BOMB_CONFIG.fuseSparkEvery){
    b.lastSpark=now;
    playSfx('bombTick',{allowOverlap:true});
    spawnFuseSpark(b.x + rBase, b.y + rBase - r - fuseLen);
  }
  ctx.restore();
}
function drawBombExplosion(b,now){
  const elapsed=now - b.explodeStart;
  const t=Math.min(1, elapsed / BOMB_EXPLOSION_DURATION);
  const scale=1 + 1.8*t;
  const alpha=1 - t;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(b.x + b.w/2, b.y + b.h/2);
  ctx.scale(scale,scale);
  if(bombImgReady){
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(bombImg,-b.w/2,-b.h/2,b.w,b.h);
    ctx.imageSmoothingEnabled=prev;
  } else {
    ctx.fillStyle='#ff9060';
    ctx.beginPath(); ctx.arc(0,0,b.w/2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  b.shards.forEach(sh=>{
    sh.x += sh.vx * sh.dt;
    sh.y += sh.vy * sh.dt;
    sh.vy += 180 * sh.dt;
    sh.rot += sh.spin * sh.dt;
    const age=now - sh.start;
    const fade=1 - age/sh.life;
    ctx.save(); ctx.globalAlpha=fade;
    ctx.translate(sh.x,sh.y);
    ctx.rotate(sh.rot);
    ctx.fillStyle=sh.col;
    ctx.fillRect(-sh.size/2,-sh.size/2,sh.size,sh.size);
    ctx.restore();
  });
  b.shards=b.shards.filter(sh => now - sh.start < sh.life);
  if(elapsed > BOMB_EXPLOSION_DURATION && b.shards.length===0) b._remove=true;
}
function spawnBombShards(b){
  const cx=b.x + b.w/2;
  const cy=b.y + b.h/2;
  for(let i=0;i<BOMB_SHARD_COUNT;i++){
    const ang=Math.random()*Math.PI*2;
    const spd=randBetween(...BOMB_SHARD_SPEED);
    const size=randBetween(...BOMB_SHARD_SIZE);
    b.shards.push({
      x:cx,y:cy,
      vx:Math.cos(ang)*spd,
      vy:Math.sin(ang)*spd - randBetween(40,140),
      size,
      start:performance.now(),
      life:400 + Math.random()*400,
      rot:0,
      spin:(Math.random()*4 - 2)*0.15,
      dt:0
    });
  }
}
function spawnFuseSpark(x,y){
  for(let i=0;i<4;i++){
    const ang=Math.random()*Math.PI*2;
    const spd=randBetween(40,90);
    catchParticles.push({
      x,y,
      vx:Math.cos(ang)*spd,
      vy:Math.sin(ang)*spd - randBetween(10,30),
      size:randBetween(2,4),
      color:BOMB_CONFIG.colorSpark,
      life:0,
      maxLife:300 + Math.random()*120
    });
  }
}
function handleBombHit(b){
  if(b.exploding) return;
  b.exploding=true;
  b.explodeStart=performance.now();
  spawnBombShards(b);
  spawnRingPulse(b.x + b.w/2,b.y + b.h/2,'rgba(255,90,50,0.55)',110,620);
  spawnCatchParticles(b.x + b.w/2,b.y + b.h/2,'#ff6430',34);
  spawnFloatText(b.x + b.w/2,b.y + b.h/2 - 12,'BOOM!','#ff8259',-80,1100,1.25);
  playSfx('bombExplode');
  const startImmune=(performance.now() - gameStartTime) < START_IMMUNITY_MS;
  if(shieldActive){
    playSfx('shieldBlock');
    spawnFloatText(b.x + b.w/2,b.y + b.h/2 + 10,'BLOCKED','#64c9ff',-70,900,1.05);
    return;
  }
  if(!(startImmune && BOMB_CONFIG.respectImmunity)){
    lives -= BOMB_CONFIG.lifeCost;
    lifeEverLost=true;
    flashBG(EFFECTS.missFlash);
    triggerShake(BOMB_CONFIG.shakeIntensity,BOMB_CONFIG.shakeDuration,'y');
    if(lives<=0) endGame(false);
    else spawnFloatText(b.x + b.w/2,b.y + b.h/2 + 8, `-${BOMB_CONFIG.lifeCost} LIFE`,
      '#ff6666', -60, 900, 1.1);
    markHudDirty();
  } else {
    spawnFloatText(b.x + b.w/2,b.y + b.h/2 + 8,'SAFE','#8ae3ff',-50,850,1);
  }
}

/* -------------------- Drawing Power-Ups / Hazards -------------------- */
function drawSnipPowerup(b,now){
  const t=(now - b.created)/1000;
  const pulse=0.85 + 0.15*Math.sin(t * SNIP_POWERUP.pulseSpeed * Math.PI);
  const r=(b.w/2)*pulse;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.55; ctx.fillStyle=SNIP_POWERUP.glow;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(snipImgReady){
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(snipImg,-r,-r,r*2,r*2); ctx.imageSmoothingEnabled=prev;
  } else {
    ctx.fillStyle=SNIP_POWERUP.color;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.font='600 12px Segoe UI,Inter,sans-serif';
    ctx.fillStyle=SNIP_POWERUP.textColor;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(SNIP_POWERUP.label,0,1);
  }
  ctx.restore();
}
function drawShieldPowerup(b,now){
  const t=(now - b.created)/1000;
  const pulse=SHIELD_POWERUP.pulseScaleMin +
    ((Math.sin(t * SHIELD_POWERUP.pulseSpeed * Math.PI * 2)*0.5+0.5)*
      (SHIELD_POWERUP.pulseScaleMax - SHIELD_POWERUP.pulseScaleMin));
  const r=(b.w/2)*pulse;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.55; ctx.fillStyle=SHIELD_POWERUP.glow;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(shieldImgReady){
    const iconSize=r*2*SHIELD_POWERUP.iconScale;
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(shieldImg,-iconSize/2,-iconSize/2,iconSize,iconSize);
    ctx.imageSmoothingEnabled=prev;
  } else if(SHIELD_POWERUP.showLabelFallback){
    ctx.font=`700 ${Math.round(r*0.9)}px Segoe UI,Inter,sans-serif`;
    ctx.fillStyle=SHIELD_POWERUP.textColor;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(SHIELD_POWERUP.label,0,2);
  }
  ctx.restore();
}
function drawTaskMgrPowerup(b,now){
  const t=(now - b.created)/1000;
  const pulse=TASKMGR_POWERUP.pulseScaleMin +
    ((Math.sin(t * TASKMGR_POWERUP.pulseSpeed * Math.PI * 2)*0.5+0.5)*
      (TASKMGR_POWERUP.pulseScaleMax - TASKMGR_POWERUP.pulseScaleMin));
  const r=(b.w/2)*pulse;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.6; ctx.fillStyle=TASKMGR_POWERUP.glow;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(taskMgrImgReady){
    const iconSize=r*2*TASKMGR_POWERUP.iconScale;
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(taskMgrImg,-iconSize/2,-iconSize/2,iconSize,iconSize);
    ctx.imageSmoothingEnabled=prev;
  } else if(TASKMGR_POWERUP.showLabelFallback){
    ctx.font=`700 ${Math.round(r*0.9)}px Segoe UI,Inter,sans-serif`;
    ctx.fillStyle=TASKMGR_POWERUP.textColor;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(TASKMGR_POWERUP.label,0,2);
  }
  ctx.restore();
}
function drawLifeBlock(b,now){
  const tLife=((now - (b.created||now))/1000)*LIFE_BLOCK.pulseSpeed;
  const scale=LIFE_BLOCK.pulseScaleMin +
    ((Math.sin(tLife*Math.PI*2)*0.5+0.5)*(LIFE_BLOCK.pulseScaleMax - LIFE_BLOCK.pulseScaleMin));
  const baseR=b.w/2;
  const r=baseR*scale;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.65; ctx.fillStyle=LIFE_BLOCK.glowColor;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  if(lifeImgReady){
    const size=r*2*LIFE_BLOCK.iconScale;
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(lifeImg,-size/2,-size/2,size,size);
    ctx.imageSmoothingEnabled=prev;
  } else if(LIFE_BLOCK.showPlusFallback){
    ctx.font=`700 ${Math.round(r*0.9)}px Segoe UI,Inter,sans-serif`;
    ctx.fillStyle=LIFE_BLOCK.textColor;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(LIFE_BLOCK.label,0,2);
  }
  ctx.restore();
}
function drawSoundwavePowerup(b,now){
  const t=(now - b.created)/1000;
  const pulse=SOUNDWAVE_POWERUP.pulseScaleMin +
    ((Math.sin(t * SOUNDWAVE_POWERUP.pulseSpeed * Math.PI * 2)*0.5+0.5)*
      (SOUNDWAVE_POWERUP.pulseScaleMax - SOUNDWAVE_POWERUP.pulseScaleMin));
  const r=(b.w/2)*pulse;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.6; ctx.fillStyle=SOUNDWAVE_POWERUP.glow;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(soundwaveImgReady){
    const iconSize=r*2*SOUNDWAVE_POWERUP.iconScale;
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(soundwaveImg,-iconSize/2,-iconSize/2,iconSize,iconSize);
    ctx.imageSmoothingEnabled=prev;
  } else if(SOUNDWAVE_POWERUP.showLabelFallback){
    ctx.font=`700 ${Math.round(r*0.9)}px Segoe UI,Inter,sans-serif`;
    ctx.fillStyle='#ffffff';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(SOUNDWAVE_POWERUP.label,0,2);
  }
  ctx.restore();
}
function drawStickyHazard(b,now){
  const t=(now - b.created)/1000;
  const pulse=0.9 + 0.1*Math.sin(t * STICKY_KEYS.pulseSpeed * Math.PI*2);
  const r=(b.w/2)*pulse;
  ctx.save(); ctx.translate(b.x+b.w/2,b.y+b.h/2);
  ctx.globalAlpha=0.5; ctx.fillStyle=STICKY_KEYS.glow;
  ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(stickyImgReady){
    const iconSize=r*2*STICKY_KEYS.iconScale;
    const prev=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(stickyImg,-iconSize/2,-iconSize/2,iconSize,iconSize);
    ctx.imageSmoothingEnabled=prev;
  } else if(STICKY_KEYS.showLabelFallback){
    ctx.font=`700 ${Math.round(r*0.9)}px Segoe UI,Inter,sans-serif`;
    ctx.fillStyle=STICKY_KEYS.textColor;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(STICKY_KEYS.label,0,2);
  }
  ctx.restore();
}

/* -------------------- Game Loop -------------------- */
function gameLoop(ts){
  if(!gameActive || gamePaused || nukeTriggered) return;
  frameCounter++;
  const rawDt=(ts - lastTs)/1000;
  const dt=adjustDtForSlowMo(rawDt);
  const dtMs=(ts - lastTs);
  lastTs=ts;

  /* Performance sampling (Essential) */
  if(ts - perfLastSampleTs >= PERF_SAMPLE_INTERVAL){
    perfLastSampleTs=ts;
    perfWindow.push({ t:ts, ft:dtMs });
    const cutoff=ts - PERF_WINDOW_MS;
    while(perfWindow.length && perfWindow[0].t < cutoff) perfWindow.shift();
    if(perfWindow.length){
      const avg = perfWindow.reduce((a,b)=>a+b.ft,0)/perfWindow.length;
      let newLevel=0;
      if(avg>PERF_THRESHOLDS[0]) newLevel=1;
      if(avg>PERF_THRESHOLDS[1]) newLevel=2;
      if(avg>PERF_THRESHOLDS[2]) newLevel=3;
      audioDegradeLevel = newLevel;
    }
  }

  ctx.clearRect(0,0,canvas.width,canvas.height);

  maybeAlternateStickyUnlock();

  if(stickyKeysActive && stickyLockX!==null){
    paddleX = stickyLockX;
  }

  maybeStartBoss();
  if(!bossActive && !bossDying && !snipReady){
    maybeSpawnBomb(ts);
    maybeSpawnSnip(ts);
    maybeSpawnShield(ts);
    maybeSpawnTaskMgr(ts);
    maybeSpawnSoundwave(ts);
    maybeSpawnSticky(ts);
  }
  maybeExpireShield();
  maybeEndSticky();

  let offX=0, offY=0;
  if(shakeStart){
    const et=performance.now() - shakeStart;
    if(et < shakeDuration){
      const damp=1 - et/shakeDuration;
      const j=shakeIntensity*damp;
      if(shakeMode==='all'){ offX=(Math.random()*2-1)*j; offY=(Math.random()*2-1)*j; }
      else if(shakeMode==='x'){ offX=(Math.random()*2-1)*j; }
      else if(shakeMode==='y'){ offY=(Math.random()*2-1)*j; }
    } else shakeStart=0;
  }
  ctx.save(); ctx.translate(offX,offY);

  const paddleY=canvas.height - 90;

  if(!bossDying && ts - lastSpawn > spawnInterval){
    spawnBlock(); lastSpawn=ts;
  }

  const now=performance.now();
  for(const b of blocks){
    if(!(b.mode==='bomb' && b.exploding)) b.y += b.speed * dt;
    if(b.mode==='bomb' && b.exploding) b.shards.forEach(sh=> sh.dt=dt);

    if(b.mode==='normal') drawNormalBlock(b);
    else if(b.mode==='bossHazard'){
      ctx.fillStyle=b.caught?'rgba(255,255,255,0.15)':b.color;
      roundedRect(ctx,b.x,b.y,b.w,b.h,14);
      ctx.save();
      ctx.font='600 18px Segoe UI,Inter,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=b.caught?'rgba(255,255,255,0.55)':b.textColor;
      ctx.fillText(b.label,b.x + b.w/2,b.y + b.h/2 + 1);
      ctx.restore();
    }
    else if(b.mode==='life') drawLifeBlock(b,now);
    else if(b.mode==='bomb') drawBomb(b,now);
    else if(b.mode==='snip') drawSnipPowerup(b,now);
    else if(b.mode==='shield') drawShieldPowerup(b,now);
    else if(b.mode==='taskmgr') drawTaskMgrPowerup(b,now);
    else if(b.mode==='soundwave') drawSoundwavePowerup(b,now);
    else if(b.mode==='sticky') drawStickyHazard(b,now);
  }

  if(bossActive && !infiniteMode && !bossDying) updateBoss(ts);
  if(bossDying) updateBossDeathAnimation(ts);

  if(!bossDying){
    blocks.forEach(b=>{
      if(b.mode==='bomb' && b.exploding) return;
      if(b.caught) return;
      if(b.y + b.h >= paddleY &&
         b.y <= paddleY + DIFFICULTY.paddleHeight &&
         b.x + b.w >= paddleX &&
         b.x <= paddleX + DIFFICULTY.paddleWidth){

        const centerX=b.x + b.w/2;
        const centerY=b.y + b.h/2;

        if(b.mode==='soundwave'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:soundwaveImg,imgReady:soundwaveImgReady,
            label:b.label,color:SOUNDWAVE_POWERUP.glow,
            iconScale:SOUNDWAVE_POWERUP.iconScale,baseRadius:b.w/2
          });
          playSfx('soundwavePickup');
          activateSoundwave(centerX,centerY);
          return;
        }
        if(b.mode==='sticky'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:stickyImg,imgReady:stickyImgReady,
            label:b.label,color:'rgba(255,255,255,0.35)',
            iconScale:STICKY_KEYS.iconScale,baseRadius:b.w/2
          });
          handleStickyHit();
          return;
        }
        if(b.mode==='taskmgr'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:taskMgrImg,imgReady:taskMgrImgReady,
            label:b.label,color:TASKMGR_POWERUP.glow,
            iconScale:TASKMGR_POWERUP.iconScale,baseRadius:b.w/2
          });
          activateTaskManager();
          return;
        }
        if(b.mode==='snip'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:snipImg,imgReady:snipImgReady,
            label:b.label,color:SNIP_POWERUP.glow,
            iconScale:0.9,baseRadius:b.w/2
          });
          beginSnipReady();
          spawnRingPulse(centerX,centerY,SNIP_POWERUP.glow,90,700);
          return;
        }
        if(b.mode==='shield'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:shieldImg,imgReady:shieldImgReady,
            label:b.label,color:SHIELD_POWERUP.glow,
            iconScale:SHIELD_POWERUP.iconScale,baseRadius:b.w/2
          });
          activateShield();
          spawnRingPulse(centerX,centerY,SHIELD_POWERUP.glow,100,700);
          return;
        }
        if(b.mode==='bomb'){ handleBombHit(b); return; }
        if(b.mode==='life'){
          b.caught=true; b._removeImmediate=true;
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:lifeImg,imgReady:lifeImgReady,
            label:LIFE_BLOCK.label,color:LIFE_BLOCK.glowColor,
            iconScale:LIFE_BLOCK.iconScale,baseRadius:b.w/2
          });
          if(lives<LIFE_BLOCK.maxLives){
            lives++;
            spawnRingPulse(centerX,centerY,'rgba(32,214,114,0.55)');
            spawnFloatText(centerX,centerY - 10,'+1 LIFE','#20d672',-60,1000,1.05);
            spawnCatchParticles(centerX,centerY,'#20d672',14);
            playSfx('lifeGain');
            triggerShake(6,140,'y');
          } else {
            spawnFloatText(centerX,centerY - 10,'MAX','#cccccc',-50,900,1);
            playSfx('lifeMax');
          }
          markHudDirty();
          return;
        }

        /* Normal block */
        b.caught=true;
        b._removeImmediate=true;
        if(bossActive){
          const dmg=BOSS_CONFIG.damagePerCatch;
          bossHealth-=dmg; if(bossHealth<0) bossHealth=0;
          score+=dmg;
          flashBG(EFFECTS.catchFlash);
          playSfx('bossHit');
          triggerShake(SHAKE_DAMAGE_INTENSITY,SHAKE_DAMAGE_DURATION,'all');
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:null,imgReady:false,
            label:b.label,color:'rgba(255,159,64,0.50)',
            iconScale:0.85,baseRadius:Math.min(b.w,b.h)/2
          });
          spawnCatchParticles(centerX,centerY,'#ff9f40',14);
            spawnFloatText(centerX,centerY - 14,`-${dmg}`,'#ffb14a',-70,900,1.05);
          maybeSpawnLifeBlock();
          const totalDamage=BOSS_CONFIG.health - bossHealth;
          if(totalDamage>0 && totalDamage % BOSS_CONFIG.dropIntervalReduceEvery===0){
            bossDropInterval=Math.max(
              BOSS_CONFIG.dropIntervalMin,
              bossDropInterval - BOSS_CONFIG.dropIntervalReduceAmount
            );
          }
          if(bossHealth<=0 && !bossDying) startBossDeathAnimation();
        } else {
          flashBG(EFFECTS.catchFlash);
          const tiny=SMALL_BLOCK_LABELS.has(b.label);
          score++;
          playSfx(tiny?'catchTiny':'catchBlock');
          const color=tiny?'#ffd257':'#58c2ff';
          spawnPowerupVanishFX({
            x:centerX,y:centerY,img:null,imgReady:false,
            label:b.label,color:tiny?'rgba(255,210,87,0.45)':'rgba(88,194,255,0.45)',
            iconScale:0.8,baseRadius:Math.min(b.w,b.h)/2
          });
          spawnCatchParticles(centerX,centerY,color,tiny?18:CATCH_PARTICLE_COUNT_BASE);
          spawnFloatText(centerX,centerY - 12,'+1',color,-60,800,1);
          if(tiny) spawnRingPulse(centerX,centerY,'rgba(255,210,87,0.55)',60,520);
          maybeSpawnLifeBlock();
          spawnInterval=Math.max(
            DIFFICULTY.minSpawnInterval,
            DIFFICULTY.baseSpawnInterval - score*DIFFICULTY.scoreSpawnReduction
          );
        }
        markHudDirty();
      }
    });
  }

  const nowTime=performance.now();
  const startImmune=(nowTime - gameStartTime) < START_IMMUNITY_MS;
  for(let i=blocks.length-1;i>=0;i--){
    const b=blocks[i];
    if(b._removeImmediate){ blocks.splice(i,1); continue; }
    if(b.mode==='bomb' && b.exploding && b._remove){ blocks.splice(i,1); continue; }
    if(!b.exploding && b.y > canvas.height + 60){
      if(!b.caught){
        if(b.mode==='life') playSfx('lifeMiss');
        else if(b.mode==='bomb'){ /* ignore fall */ }
        else if(['snip','shield','taskmgr','soundwave','sticky'].includes(b.mode)){ /* ignore miss */ }
        else if(!startImmune && !bossDying){
          if(shieldActive){
            playSfx('shieldBlock');
            spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2,
              canvas.height -130,'BLOCKED','#64c9ff',-60,900,1);
          } else {
            lives--;
            lifeEverLost=true;
            flashBG(EFFECTS.missFlash);
            spawnFloatText(paddleX + DIFFICULTY.paddleWidth/2,
              canvas.height -100,'-1 LIFE','#ff6666',-70,950,1.1);
            playSfx('miss');
            triggerShake(SHAKE_LIFE_LOST_INTENSITY,SHAKE_LIFE_LOST_DURATION,'x');
            if(lives<=0) endGame(false);
            markHudDirty();
          }
        }
      }
      blocks.splice(i,1);
    }
  }

  drawTaskbarPaddle(paddleX, paddleY, DIFFICULTY.paddleWidth);
  renderShieldAura();
  renderStickyLockAnim();
  updateAndRenderFX(dtMs);
  updateRenderVanishFX(performance.now());

  if(snipReady && !bossActive && !bossDying){
    renderSnipOverlay();
    if(performance.now() - snipAimStart > SNIP_POWERUP.aimTimeoutMs && !snipDragging){
      cancelSnip();
    }
  }

  ctx.restore();

  if(hudDirty || (frameCounter % 12 === 0)){
    updateHUD();
    hudDirty=false;
  }

  if(gameActive && !nukeTriggered) rafId=requestAnimationFrame(gameLoop);
}

/* -------------------- SNIP Overlay -------------------- */
function renderSnipOverlay(){
  ctx.save();
  ctx.fillStyle=SNIP_POWERUP.fadeOverlay;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Adjustable vertical offset constant (higher number = lower on screen)
  const SNIP_OVERLAY_TEXT_Y = 140;
  const SNIP_OVERLAY_TIMER_Y = SNIP_OVERLAY_TEXT_Y + 26;

  ctx.font='600 18px Segoe UI,Inter,sans-serif';
  ctx.fillStyle='#ffffff';
  ctx.textAlign='center';
  ctx.fillText('SNIP MODE: Drag mouse or finger', canvas.width/2, SNIP_OVERLAY_TEXT_Y);

  const remaining=Math.max(0,SNIP_POWERUP.aimTimeoutMs - (performance.now() - snipAimStart));
  ctx.font='500 13px Segoe UI,Inter,sans-serif';
  ctx.fillText(`${Math.ceil(remaining/1000)}s`, canvas.width/2, SNIP_OVERLAY_TIMER_Y);

  if(snipRect){
    ctx.strokeStyle=SNIP_POWERUP.outlineColor;
    ctx.lineWidth=SNIP_POWERUP.strokeWidth;
    ctx.strokeRect(snipRect.x,snipRect.y,snipRect.w,snipRect.h);
    ctx.fillStyle=SNIP_POWERUP.fillRectColor;
    ctx.fillRect(snipRect.x,snipRect.y,snipRect.w,snipRect.h);
  }
  ctx.restore();
}

/* -------------------- Pointer / Touch for SNIP / Paddle -------------------- */
function pointerCanvasPos(e){
  const rect=canvas.getBoundingClientRect();
  return {
    x:(e.clientX - rect.left)/rect.width*canvas.width,
    y:(e.clientY - rect.top)/rect.height*canvas.height
  };
}

function onPointerDown(e){
  if(!snipReady) return;
  e.preventDefault();
  snipDragging=true;
  snipDragStarted=false;
  const p=pointerCanvasPos(e);
  snipDragOrigin=p;
  snipRect={x:p.x,y:p.y,w:0,h:0};
}
function onPointerMove(e){
  if(!snipReady||!snipDragging) return;
  const p=pointerCanvasPos(e);
  const ox=snipDragOrigin.x, oy=snipDragOrigin.y;
  snipRect.x=Math.min(ox,p.x);
  snipRect.y=Math.min(oy,p.y);
  snipRect.w=Math.abs(p.x - ox);
  snipRect.h=Math.abs(p.y - oy);
  if(!snipDragStarted && (snipRect.w>6 || snipRect.h>6)){
    snipDragStarted=true; playSfx('snipDragStart');
  }
}
function onPointerUp(){
  if(!snipReady||!snipDragging) return;
  snipDragging=false;
  if(snipDragStarted && snipRect && snipRect.w>4 && snipRect.h>4) executeSnip(snipRect);
  else cancelSnip();
}

/* ---- Touch (Enhanced for Mobile Snip) ---- */
function onTouchStart(e){
  if(!gameActive || gamePaused || nukeTriggered || bossDying) return;

  if(!snipReady){
    if(e.touches.length === 1){
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      paddleX = (t.clientX - rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
      clampPaddle();
    }
    return;
  }
  e.preventDefault();

  const now=performance.now();
  if(now - snipLastTapTime < SNIP_DOUBLE_TAP_MS){
    cancelSnip();
    return;
  }
  snipLastTapTime=now;

  if(e.touches.length === 1){
    snipMultiTouch=false;
    const t=e.touches[0];
    const p=pointerCanvasPos(t);
    snipDragOrigin=p;
    snipRect={x:p.x,y:p.y,w:0,h:0};
    snipDragging=true;
    snipDragStarted=false;
  } else if(e.touches.length >= 2){
    snipMultiTouch=true;
    snipDragging=true;
    snipDragStarted=true;
    updateSnipRectFromTouches(e.touches);
  }
}
function onTouchDrag(e){
  if(!gameActive || gamePaused || nukeTriggered || bossDying) return;

  if(!snipReady){
    if(e.touches.length===1){
      const t=e.touches[0];
      const rect=canvas.getBoundingClientRect();
      paddleX=(t.clientX - rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
      clampPaddle();
    }
    return;
  }
  if(!snipDragging) return;
  e.preventDefault();

  if(e.touches.length >= 2){
    snipMultiTouch=true;
    updateSnipRectFromTouches(e.touches);
    return;
  }

  const t=e.touches[0];
  const p=pointerCanvasPos(t);
  const ox=snipDragOrigin.x;
  const oy=snipDragOrigin.y;
  snipRect.x=Math.min(ox,p.x);
  snipRect.y=Math.min(oy,p.y);
  snipRect.w=Math.abs(p.x - ox);
  snipRect.h=Math.abs(p.y - oy);
  if(!snipDragStarted && (snipRect.w>6 || snipRect.h>6)){
    snipDragStarted=true;
    playSfx('snipDragStart');
  }
}
function onTouchEnd(e){
  if(!snipReady){
    return;
  }
  if(e.touches && e.touches.length>0){
    if(snipMultiTouch){
      updateSnipRectFromTouches(e.touches);
    }
    return;
  }
  if(!snipDragging) return;
  snipDragging=false;
  if(!snipRect){
    cancelSnip();
    return;
  }
  if(snipRect.w < SNIP_MIN_TOUCH_SIZE && snipRect.h < SNIP_MIN_TOUCH_SIZE){
    cancelSnip();
    return;
  }
  executeSnip(snipRect);
}

function updateSnipRectFromTouches(touches){
  if(!snipRect) snipRect={x:0,y:0,w:0,h:0};
  const rect=canvas.getBoundingClientRect();
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let i=0;i<touches.length;i++){
    const t=touches[i];
    const cx=(t.clientX - rect.left)/rect.width*canvas.width;
    const cy=(t.clientY - rect.top)/rect.height*canvas.height;
    if(cx<minX) minX=cx;
    if(cy<minY) minY=cy;
    if(cx>maxX) maxX=cx;
    if(cy>maxY) maxY=cy;
  }
  if(minX===Infinity){
    snipRect.w=snipRect.h=0; return;
  }
  snipRect.x=minX;
  snipRect.y=minY;
  snipRect.w=Math.max(0,maxX-minX);
  snipRect.h=Math.max(0,maxY-minY);
}

/* -------------------- HUD -------------------- */
function updateHUD(){
  let line;
  if(infiniteMode) line='Mode: INFINITE';
  else if(bossDying){
    const el=performance.now() - bossDeathStart;
    const pct=Math.min(100, Math.floor((el / BOSS_DEATH_DURATION)*100));
    line=`Boss dismantling: ${pct}%`;
  } else if(bossActive){
    line=`Boss HP: ${bossHealth}/${BOSS_CONFIG.health}`;
  } else {
    const toGoBoss=Math.max(0,BOSS_CONFIG.triggerScore - score);
    line=`Boss @ ${BOSS_CONFIG.triggerScore} (to go: ${toGoBoss})`;
  }
  let shieldTag='';
  if(shieldActive){
    const remain=Math.max(0, shieldEndTime - performance.now());
    shieldTag=` <span style="color:${SHIELD_POWERUP.hudTagColor};">SHIELD ${Math.ceil(remain/1000)}s</span>`;
  }
  const stickyTag = stickyKeysActive
    ? ` <span style="color:#ffa8ff;">LOCK ${Math.ceil((stickyKeysEnd - performance.now())/1000)}s</span>`
    : '';
  const snipTag = snipReady ? ' <span style="color:#ff89d2;">SNIP READY</span>' : '';
  const tmTag = slowMoActive ? ' <span style="color:#ffd24d;">TM SLOW-MO</span>' : '';
  const swTag = soundwaveUnlocked ? ' <span style="color:#bfa8ff;">SW</span>' : '';
  const stkUnlockTag = stickyUnlocked ? ' <span style="color:#ffccff;">STK</span>' : '';
  const altInfo = (!stickyUnlocked && !soundwaveUnlocked && score < STICKY_SCORE_UNLOCK_THRESHOLD)
    ? `<br><span style="opacity:.6">STK @ ${STICKY_SCORE_UNLOCK_THRESHOLD} (no flawless)</span>` : '';

  hudEl.innerHTML =
    `Score: ${score}${(score>highScore)?' <span style="color:#20d672">(+)':''}`+
    `<br>High: ${highScore}${newHigh?' <span class="tag-new">NEW!</span>':''}`+
    `<br>Lives: ${lives}/${LIFE_BLOCK.maxLives}`+
    `<br>${line}${shieldTag}${snipTag}${tmTag}${swTag}${stkUnlockTag}${stickyTag}`+
    altInfo +
    (infiniteUnlocked && !infiniteMode ? `<br><span style="opacity:.8">I: Infinite Mode</span>` : '')+
    (!bossDying ? `<br><span style="opacity:.7">P:Pause Esc:Exit</span>` : '');
}

/* -------------------- Visual Effects -------------------- */
function flashBG(color){
  if(!overlayEl || nukeTriggered) return;
  overlayEl.style.background=color;
  if(flashBG._t) clearTimeout(flashBG._t);
  flashBG._t=setTimeout(()=>{
    if(!nukeTriggered) overlayEl.style.background=BASE_OVERLAY_BG;
  }, EFFECTS.flashDuration);
}

/* -------------------- Input -------------------- */
function clampPaddle(){
  const m=DIFFICULTY.paddleEdgeMargin;
  if(paddleX<m) paddleX=m;
  if(paddleX + DIFFICULTY.paddleWidth > canvas.width - m)
    paddleX = canvas.width - m - DIFFICULTY.paddleWidth;
}
function resizeCanvas(){
  canvas.width=innerWidth;
  canvas.height=innerHeight;
  clampPaddle();
}
function onMouseMove(e){
  if(!gameActive||gamePaused||nukeTriggered||bossDying) return;
  if(snipReady) return;
  if(stickyKeysActive) return;
  const rect=canvas.getBoundingClientRect();
  paddleX=(e.clientX - rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
  clampPaddle();
}
function onTouchMove(e){
  if(!gameActive||gamePaused||nukeTriggered||bossDying) return;
  if(snipReady) return;
  if(stickyKeysActive) return;
  if(e.touches.length!==1) return;
  const t=e.touches[0];
  const rect=canvas.getBoundingClientRect();
  paddleX=(t.clientX - rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
  clampPaddle();
}
function onGameKey(e){
  if(nukeTriggered) return;
  if(!gameActive){
    if(e.key==='r'||e.key==='R') (infiniteMode?startInfiniteGame():startGame());
    else if((e.key==='i'||e.key==='I') && infiniteUnlocked) startInfiniteGame();
    else if(e.key==='g'||e.key==='G') startGame();
    else if(e.key==='Escape') exitGame();
    if(['r','R','i','I','g','G'].includes(e.key)) playSfx('uiSelect');
    return;
  }
  if(bossDying){
    if(e.key==='Escape'){ playSfx('uiSelect'); exitGame(); }
    return;
  }
  if(snipReady){
    if(e.key==='Escape') cancelSnip();
    return;
  }

  let move=0;
  if(['ArrowLeft','a','A'].includes(e.key)) move=-55;
  else if(['ArrowRight','d','D'].includes(e.key)) move=55;

  if(move!==0){
    if(!stickyKeysActive){
      paddleX+=move;
      clampPaddle();
    }
  } else if(e.key==='p'||e.key==='P'){
    playSfx('uiSelect'); pauseGame();
  } else if(e.key==='Escape'){
    playSfx('uiSelect'); exitGame();
  }
}
function pauseGame(){
  if(!gameActive||nukeTriggered||bossDying) return;
  if(snipReady) return;
  gamePaused=!gamePaused;
  if(gamePaused){
    applyPauseDuck();
    msgEl.textContent='Paused';
    msgEl.classList.add('show');
  } else {
    removePauseDuck();
    msgEl.classList.remove('show');
    lastTs=performance.now();
    rafId=requestAnimationFrame(gameLoop);
  }
}
function exitGame(){
  cancelAnimationFrame(rafId);
  overlayEl.style.display='none';
  if(flashBG._t){ clearTimeout(flashBG._t); flashBG._t=null; }
  overlayEl.style.background=BASE_OVERLAY_BG;
  showPlayPrompt();
  fadeOutAndStopMusic(600);
  unbindGameListeners();
  gameActive=false;
  playSfx('uiSelect');
}

/* -------------------- Lives Banner -------------------- */
function showStartLivesBanner(){
  const startLives=DIFFICULTY.lives;
  const old=document.getElementById('start-lives-banner');
  if(old) old.remove();
  const div=document.createElement('div');
  div.id='start-lives-banner';
  div.textContent=`${startLives} LIVES`;
  div.style.cssText=`position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    font:700 clamp(3rem,10vw,6rem) "Segoe UI", Inter, system-ui, sans-serif;
    color:#ffffff; letter-spacing:.15em; text-shadow:0 0 14px rgba(0,180,255,0.55),0 0 4px rgba(0,0,0,0.7);
    background:radial-gradient(circle at 50% 50%, rgba(0,80,140,0.35), rgba(0,0,0,0.85));
    backdrop-filter:blur(4px); animation:livesBannerFade 2.2s forwards; z-index:9998; pointer-events:none;`;
  document.body.appendChild(div);
  if(!document.getElementById('start-lives-banner-style')){
    const style=document.createElement('style');
    style.id='start-lives-banner-style';
    style.textContent=`@keyframes livesBannerFade{
      0%{opacity:0;transform:scale(.85);}
      12%{opacity:1;transform:scale(1);}
      70%{opacity:1;}
      100%{opacity:0;transform:scale(1.05);}
    }`;
    document.head.appendChild(style);
  }
  setTimeout(()=>div.remove(),2300);
}

/* -------------------- End Game (Enhanced) -------------------- */
function endGame(victory = false){
  if (nukeTriggered) return;

  if (victory) unlockInfinite();

  if (victory){
    if (infiniteMode){
      playMusic('infinite');
    } else if (!REQUIRE_PERFECT_VICTORY){
      playMusic('normal', { force:true });
    }
  } else {
    fadeOutAndStopMusic();
  }

  if (infiniteMode){
    if(!victory && REDIRECT_ON_LOSS && INFINITE_REDIRECT_ON_LOSS){
  playSfx('gameOver');
  showLossIframe(LOSS_REDIRECT_URL);
  return;
}
    finalizeInfiniteScreen();
    return;
  }

  const flawless = victory && !lifeEverLost;

  if (flawless && !soundwaveUnlocked){
    soundwaveUnlocked = true;
    soundwaveJustUnlocked = true;
    try { localStorage.setItem(SOUNDWAVE_UNLOCK_KEY,'1'); } catch {}
  }

  const shouldNuke = (!victory) || (victory && REQUIRE_PERFECT_VICTORY && lifeEverLost);
  if (shouldNuke){
    if (REDIRECT_ON_LOSS){
  playSfx('gameOver');
  showLossIframe(LOSS_REDIRECT_URL);
  return;
}
    playSfx('nuke');
    triggerNuke(!victory
      ? 'Defenses collapsed.'
      : 'Win detected, but insufficient purity (lives lost).');
    gameActive = false;
    nukeTriggered = true;
    return;
  }

  gameActive = false;
  updateHighScoreIfNeeded();

  const useEnhancedVictoryUI =
    (flawless && SHOW_ESU_SCREEN) ||
    (!flawless && (stickyJustUnlocked || stickyUnlocked));

  if (useEnhancedVictoryUI){
    if (flawless) playSfx('flawless');
    else playSfx('victory');

    const unlockLines = [];

    if (soundwaveJustUnlocked){
      unlockLines.push(
        '<p style="margin:0;font-size:.75rem;color:#cdb8ff;">Soundwave power-up unlocked!</p>'
      );
    }

    if (!flawless && (stickyJustUnlocked || stickyUnlocked)){
      if (stickyJustUnlocked){
        unlockLines.push(
          '<p style="margin:0;font-size:.75rem;color:#ffccff;">Sticky Keys hazard unlocked!</p>'
        );
      } else {
        unlockLines.push(
          '<p style="margin:0;font-size:.75rem;color:#ffccff;opacity:.85;">Sticky Keys hazard active.</p>'
        );
      }
    } else if (stickyJustUnlocked){
      unlockLines.push(
        '<p style="margin:0;font-size:.75rem;color:#ffccff;">Sticky Keys hazard unlocked!</p>'
      );
    }

    const title = flawless
      ? 'Extended Security Updates Granted'
      : 'System Defended';
    const subtitle = flawless
      ? `You defeated <strong>${BOSS_CONFIG.label}</strong> flawlessly.`
      : `You defeated <strong>${BOSS_CONFIG.label}</strong>.`;

    const buttons = `
      ${(infiniteUnlocked ? '<button class="esu-btn" data-act="infinite">Infinite (I)</button>' : '')}
      <button class="esu-btn" data-act="replay">Replay (R)</button>
      <button class="esu-btn" data-act="exit">Exit (Esc)</button>
    `;

    msgEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1.1rem;max-width:600px;">
        <h2 style="margin:0;font-weight:300;letter-spacing:1px;font-size:2.2rem;">${title}</h2>
        <p style="margin:0;line-height:1.4;">${subtitle}</p>
        <p style="margin:0;font-size:.8rem;opacity:.75;">Score: ${score} — High: ${highScore}${newHigh ? ' <span class="tag-new">NEW!</span>' : ''}</p>
        ${unlockLines.length
          ? unlockLines.join('')
          : '<p style="margin:0;font-size:.75rem;opacity:.6;">(No new unlocks)</p>'}
        <div style="display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;">
          ${buttons}
        </div>
      </div>`;
    styleESUButtons();
    msgEl.classList.add('show');
    wireESUButtons();
    markHudDirty();
    return;
  }

  playSfx('victory');
  const showInfiniteBtn = infiniteUnlocked
    ? '<button class="esu-btn" data-act="infinite">Infinite (I)</button>'
    : '';
  msgEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:520px;">
      <h2 style="margin:0;font-weight:300;letter-spacing:.5px;font-size:2.1rem;">Victory</h2>
      <p style="margin:0;font-size:.85rem;opacity:.8;">Defended vs <strong>${BOSS_CONFIG.label}</strong></p>
      <p style="margin:0;font-size:.75rem;opacity:.75;">Score: ${score} — High: ${highScore}${newHigh ? ' <span class="tag-new">NEW!</span>' : ''}</p>
      <div style="display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;">
        ${showInfiniteBtn}
        <button class="esu-btn" data-act="replay">Replay (R)</button>
        <button class="esu-btn" data-act="exit">Exit (Esc)</button>
      </div>
      <p style="margin:0;font-size:.6rem;opacity:.55;">Keys: ${infiniteUnlocked ? 'I ' : ''}R Esc</p>
    </div>`;
  styleESUButtons();
  msgEl.classList.add('show');
  wireESUButtons();
  markHudDirty();
}

/* -------------------- Infinite Mode End Screen (Parity) -------------------- */
function finalizeInfiniteScreen(){
  gameActive = false;
  updateHighScoreIfNeeded();
  playSfx('gameOver');

  const scoreLine = `Score: ${score} — High: ${highScore}${newHigh ? ' <span class="tag-new">NEW!</span>' : ''}`;

  const buttons = `
    <button class="esu-btn" data-act="infinite">Restart Infinite (I)</button>
    <button class="esu-btn" data-act="boss">Boss Mode (G)</button>
    <button class="esu-btn" data-act="exit">Exit (Esc)</button>
  `;

  msgEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1.05rem;max-width:620px;">
      <h2 style="margin:0;font-weight:300;letter-spacing:.5px;font-size:2.15rem;">Infinite Run Complete</h2>
      <p style="margin:0;font-size:.85rem;opacity:.8;line-height:1.35;">
        Waves of updates eventually overwhelmed your defenses.
      </p>
      <p style="margin:0;font-size:.8rem;opacity:.75;">${scoreLine}</p>
      <div style="display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;">
        ${buttons}
      </div>
      <p style="margin:0;font-size:.6rem;opacity:.55;">Keys: I G Esc</p>
    </div>
  `;
  styleESUButtons();
  msgEl.classList.add('show');
  wireESUButtons();
  markHudDirty();
}

/* -------------------- End Game Helpers -------------------- */
function styleESUButtons(){
  if(document.getElementById('esu-btn-styles')) return;
  const s=document.createElement('style');
  s.id='esu-btn-styles';
  s.textContent=`
    .esu-btn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);
      color:#fff;padding:.55rem 1.1rem;font:inherit;font-size:.7rem;letter-spacing:.7px;
      cursor:pointer;border-radius:8px;transition:background .2s,transform .15s;}
    .esu-btn:hover{background:rgba(255,255,255,0.28);}
    .esu-btn:active{transform:scale(.94);}
  `;
  document.head.appendChild(s);
}
function wireESUButtons(){
  msgEl.querySelectorAll('.esu-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      playSfx('uiSelect');
      const act=b.dataset.act;
      if(act==='infinite')      startInfiniteGame();
      else if(act==='replay')   startGame();
      else if(act==='boss')     startGame();
      else if(act==='exit')     exitGame();
    });
  });
}
function updateHighScoreIfNeeded(){
  if(score>highScore){
    highScore=score; newHigh=true;
    try{ localStorage.setItem(HIGH_SCORE_KEY, highScore); }catch{}
    markHudDirty();
  }
}

/* -------------------- Spawn Normal / Hazards -------------------- */
function spawnBlock(){
  if(bossActive || bossDying || (!infiniteMode && score >= BOSS_CONFIG.triggerScore && !bossActive)) return;
  const tier=sizeTierCache
    ? sizeTierCache[Math.floor(Math.random()*sizeTierCache.length)]
    : { label:'-KB', speedFactor:1, textColor:'#0078d7', glowColor:null, width:90, height:36 };
  const w=tier.width;
  const h=tier.height;
  const x=Math.random()*(canvas.width - w - 80)+40;
  const baseSpeed=randBetween(...DIFFICULTY.baseSpeedRange);
  const speed=baseSpeed * tier.speedFactor * (1 + score * DIFFICULTY.scoreSpeedFactor);
  blocks.push({
    mode:'normal',
    label:tier.label,
    textColor:tier.textColor,
    glowColor:tier.glowColor,
    x,y:-h-10,
    w,h,
    speed,
    caught:false
  });
}
function spawnBossHazard(){
  if(bossDying) return;
  const hz = HAZARDS[Math.floor(Math.random()*HAZARDS.length)];
  const padX = 16;
  ctx.save(); ctx.font='600 18px Segoe UI,Inter,sans-serif';
  const textW = ctx.measureText(hz.label).width;
  ctx.restore();
  const w = Math.max(130, Math.ceil(textW + padX*2));
  const h = 42;
  const x = Math.random()*(canvas.width - w - 160)+80;
  const baseSpeed = randBetween(...BOSS_CONFIG.dropSpeedRange);
  const speed = baseSpeed * HAZARD_SPEED[hz.class];
  blocks.push({
    mode:'bossHazard',
    label:hz.label,
    hazardClass:hz.class,
    color:hz.color,
    textColor:hz.text,
    x,y:BOSS_CONFIG.topY + BOSS_CONFIG.height,
    w,h,
    speed,
    caught:false
  });

  const now=performance.now();
  if (now - lastBossHazardSfx > 120) {
    const vol = hz.class === 'extreme' ? 1.0 : 0.85;
    playSfx('bossHazardDrop', { allowOverlap: true, volumeScale: vol });
    lastBossHazardSfx = now;
  }
}

/* -------------------- Boss Lifecycle -------------------- */
function maybeStartBoss(){
  if(infiniteMode || bossDying) return;
  if(!bossActive && score >= BOSS_CONFIG.triggerScore){
    bossActive=true;
    bossStartTime=performance.now();
    blocks=[];
    flashBG('rgba(255,255,255,0.55)');
    playSfx('bossSpawn');
    playMusic('boss');
    resetSnipState();
    shieldActive=false;
    markHudDirty();
  }
}
function updateBoss(ts){
  if(bossDying) return;
  const t=(ts - bossStartTime)/1000;
  const centerX=canvas.width/2;
  const bossX=centerX + Math.sin(t * BOSS_CONFIG.moveSpeed)*BOSS_CONFIG.moveAmplitude - BOSS_CONFIG.width/2;

  ctx.fillStyle='#ffffff';
  roundedRect(ctx,bossX,BOSS_CONFIG.topY,BOSS_CONFIG.width,BOSS_CONFIG.height,24);

  ctx.font='600 30px Segoe UI,Inter,sans-serif';
  ctx.textBaseline='middle';
  const label=BOSS_CONFIG.label;
  const metrics=ctx.measureText(label);
  const textWidth=metrics.width;

  const logoMaxH=BOSS_CONFIG.height*0.70;
  let logoW=logoMaxH, logoH=logoMaxH;
  if(bossLogoReady && bossLogoImg?.naturalWidth){
    const ratio=bossLogoImg.naturalWidth / bossLogoImg.naturalHeight;
    logoH=logoMaxH; logoW=logoMaxH*ratio;
  }
  const spacing=18;
  const totalWidth=logoW + spacing + textWidth;
  const startX=bossX + (BOSS_CONFIG.width - totalWidth)/2;
  const cY=BOSS_CONFIG.topY + BOSS_CONFIG.height/2;

  if(bossLogoReady){
    ctx.drawImage(bossLogoImg, startX, cY - logoH/2, logoW, logoH);
  } else {
    ctx.fillStyle='#0078d7';
    ctx.fillRect(startX, cY - logoH/2, logoW, logoH);
    ctx.fillStyle='#ffffff';
    ctx.font='700 18px Segoe UI,Inter,sans-serif';
    ctx.textAlign='center';
    ctx.fillText('M', startX + logoW/2, cY + 2);
    ctx.font='600 30px Segoe UI,Inter,sans-serif';
  }

  ctx.fillStyle='#0078d7';
  ctx.textAlign='left';
  ctx.fillText(label, startX + logoW + spacing, cY + 2);

  const barW=460, barH=16;
  const hbX=canvas.width/2 - barW/2;
  const hbY=BOSS_CONFIG.topY - 30;
  ctx.fillStyle='rgba(255,255,255,0.25)';
  roundedRect(ctx,hbX,hbY,barW,barH,8);
  const pct=bossHealth / BOSS_CONFIG.health;
  ctx.fillStyle=pct>.5?'#20d672':(pct>.25?'#ffc14d':'#ff5a5a');
  roundedRect(ctx,hbX,hbY,barW*pct,barH,8);

  const now=performance.now();
  if(now - lastBossDrop > bossDropInterval){
    spawnBossHazard();
    lastBossDrop=now;
  }
}

function showLossIframe(url){
  if (document.getElementById('loss-iframe-container')) return;

  try { cancelAnimationFrame(rafId); } catch {}
  gameActive = false;
  gamePaused = false;
  nukeTriggered = false;
  try { unbindGameListeners(); } catch {}

  const gOverlay = document.getElementById('game-overlay');
  if (gOverlay) gOverlay.style.display = 'none';
  const gHud = document.getElementById('game-hud');
  if (gHud) gHud.style.display = 'none';
  const msg = document.getElementById('game-message');
  if (msg) { msg.classList.remove('show'); msg.textContent=''; }

  const wrap = document.createElement('div');
  wrap.id = 'loss-iframe-container';
  wrap.style.cssText = `
    position:fixed;
    inset:0;
    z-index:999999;
    background:#000;
    display:flex;
    flex-direction:column;
  `;

  const bar = document.createElement('div');
  bar.style.cssText = `
    flex:0 0 auto;
    padding:6px 10px;
    font:600 12px Segoe UI,Inter,sans-serif;
    letter-spacing:.5px;
    background:rgba(0,0,0,0.65);
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:space-between;
    user-select:none;
  `;
  bar.innerHTML = `
    <span style="opacity:.8;">YOU LOST</span>
    <button id="loss-exit-btn" style="
      background:rgba(255, 0, 0, 0.69);
      border:1px solid rgba(255,255,255,0.35);
      color:#fff;
      font:600 11px Segoe UI,Inter,sans-serif;
      padding:4px 10px;
      border-radius:6px;
      cursor:pointer;
      letter-spacing:.6px;
    ">Try Again</button>
  `;

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.cssText = `
    flex:1 1 auto;
    width:100%;
    height:100%;
    border:0;
    background:#000;
  `;

  wrap.appendChild(bar);
  wrap.appendChild(iframe);
  document.body.appendChild(wrap);

  // Reload page on close
  bar.querySelector('#loss-exit-btn').addEventListener('click', () => {
    location.reload();
  });
}

/* -------------------- Export API -------------------- */
export const GameAPI = {
  startGame,
  startInfiniteGame,
  showPlayPrompt
};