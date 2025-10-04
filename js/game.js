/* Game logic & boss fight */
import {
  HIGH_SCORE_KEY, SIZE_TIERS, DIFFICULTY, BLOCK_STYLE, EFFECTS,
  BOSS_CONFIG, HAZARDS, HAZARD_SPEED, REQUIRE_PERFECT_VICTORY
} from './config.js';
import { randBetween, roundedRect } from './utils.js';
import { triggerNuke } from './nuke.js';

let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0;
let newHigh = false;

let gameActive = false;
let gamePaused = false;
let nukeTriggered = false;

let score=0, lives=DIFFICULTY.lives;
let spawnInterval = DIFFICULTY.baseSpawnInterval;
let lastSpawn = 0;

let blocks=[];
let paddleX=0;
let canvas, ctx, hudEl, overlayEl, msgEl;
let rafId=null;
let lastTs=0;

let bossActive=false;
let bossHealth=BOSS_CONFIG.health;
let bossDropInterval=BOSS_CONFIG.dropIntervalStart;
let lastBossDrop=0;
let bossStartTime=0;

const playPrompt = () => document.getElementById('play-prompt');

export function showPlayPrompt(){ playPrompt().style.display='block'; }
export function hidePlayPrompt(){ playPrompt().style.display='none'; }

export function initGame(){
  // Nothing else yet
}

export function startGame(){
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  hudEl = document.getElementById('game-hud');
  overlayEl = document.getElementById('game-overlay');
  msgEl = document.getElementById('game-message');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive:false });
  window.addEventListener('keydown', onGameKey);

  hidePlayPrompt();
  overlayEl.style.display='block';

  score=0; lives=DIFFICULTY.lives; newHigh=false;
  spawnInterval=DIFFICULTY.baseSpawnInterval;
  blocks=[];
  paddleX=canvas.width/2 - DIFFICULTY.paddleWidth/2;
  bossActive=false; bossHealth=BOSS_CONFIG.health; bossDropInterval=BOSS_CONFIG.dropIntervalStart;
  lastBossDrop=0; bossStartTime=0; nukeTriggered=false;
  gameActive=true; gamePaused=false;
  lastSpawn=0; lastTs=performance.now();
  msgEl.textContent=""; msgEl.classList.remove('show');

  rafId=requestAnimationFrame(gameLoop);
}

function endGame(victory=false){
  if (nukeTriggered) return;
  const lostLife = lives < DIFFICULTY.lives;
  const shouldNuke = (!victory) || (victory && REQUIRE_PERFECT_VICTORY && lostLife);

  if (shouldNuke){
    triggerNuke(!victory ? "Defenses collapsed." : "Win detected, but insufficient purity. Compliance upgrade enforced.");
    gameActive=false;
    nukeTriggered=true;
    return;
  }

  gameActive=false;
  if (score > highScore){
    highScore=score; newHigh=true;
    localStorage.setItem(HIGH_SCORE_KEY, highScore);
  }
  msgEl.innerHTML =
    `Victory!${REQUIRE_PERFECT_VICTORY ? " (Perfect Defense)" : ""}<br>` +
    `<span style="font-size:.6em;opacity:.85">Score: ${score} — High Score: ${highScore}` +
    `${newHigh?' <span class="tag-new">NEW!</span>':''}<br>R: Restart &nbsp; Esc: Exit</span>`;
  msgEl.classList.add('show');
}

function spawnBlock(){
  if (bossActive) return;
  const tier = SIZE_TIERS[Math.floor(Math.random()*SIZE_TIERS.length)];
  const label = tier.label;
  const charWidth=9;
  const paddingX=14;
  const w=Math.max(54,label.length*charWidth+paddingX*2);
  const h=36;
  const x=Math.random()*(canvas.width - w - 80)+40;
  const baseSpeed=randBetween(...DIFFICULTY.baseSpeedRange);
  const speed=baseSpeed * tier.speedFactor * (1 + score*DIFFICULTY.scoreSpeedFactor);
  blocks.push({ mode:'normal', label, x, y:-h-10, w, h, speed, caught:false });
}

function spawnBossHazard(){
  const hazard = HAZARDS[Math.floor(Math.random()*HAZARDS.length)];
  const charWidth=9;
  const paddingX=16;
  const w=Math.max(130,hazard.label.length*charWidth + paddingX*2);
  const h=42;
  const x=Math.random()*(canvas.width - w - 160)+80;
  const baseSpeed=randBetween(...BOSS_CONFIG.dropSpeedRange);
  const speed=baseSpeed * HAZARD_SPEED[hazard.class];
  blocks.push({
    mode:'bossHazard',
    label:hazard.label,
    hazardClass:hazard.class,
    color:hazard.color,
    textColor:hazard.text,
    x, y:BOSS_CONFIG.topY + BOSS_CONFIG.height,
    w, h, speed, caught:false
  });
}

function maybeStartBoss(){
  if(!bossActive && score >= BOSS_CONFIG.triggerScore){
    bossActive=true;
    bossStartTime=performance.now();
    blocks=[];
    flashBG("rgba(255,255,255,0.55)");
  }
}

function updateBoss(ts){
  const t=(ts - bossStartTime)/1000;
  const centerX=canvas.width/2;
  const bossX = centerX + Math.sin(t * BOSS_CONFIG.moveSpeed)*BOSS_CONFIG.moveAmplitude - BOSS_CONFIG.width/2;

  ctx.fillStyle="#ffffff";
  roundedRect(ctx,bossX,BOSS_CONFIG.topY,BOSS_CONFIG.width,BOSS_CONFIG.height,24);
  ctx.font="600 30px Segoe UI, Inter, sans-serif";
  ctx.fillStyle="#0078d7";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(BOSS_CONFIG.label, bossX + BOSS_CONFIG.width/2, BOSS_CONFIG.topY + BOSS_CONFIG.height/2 + 2);

  const barW=460, barH=16;
  const hbX=canvas.width/2 - barW/2;
  const hbY=BOSS_CONFIG.topY - 30;
  ctx.fillStyle="rgba(255,255,255,0.25)";
  roundedRect(ctx,hbX,hbY,barW,barH,8);
  const pct = bossHealth / BOSS_CONFIG.health;
  ctx.fillStyle= pct>.5 ? "#20d672" : (pct>.25 ? "#ffc14d" : "#ff5a5a");
  roundedRect(ctx,hbX,hbY,barW*pct,barH,8);

  const now=performance.now();
  if (now - lastBossDrop > bossDropInterval){
    spawnBossHazard();
    lastBossDrop=now;
  }
}

function gameLoop(ts){
  if(!gameActive || gamePaused || nukeTriggered) return;
  const dt=(ts - lastTs)/1000;
  lastTs=ts;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  maybeStartBoss();

  const paddleY = canvas.height - 90;

  if(!bossActive && ts - lastSpawn > spawnInterval){
    spawnBlock();
    lastSpawn=ts;
  }

  ctx.textAlign='center';
  ctx.textBaseline='middle';

  blocks.forEach(b=>{
    b.y += b.speed * dt;
    if (b.mode==='normal'){
      ctx.fillStyle = b.caught ? BLOCK_STYLE.caughtColor : BLOCK_STYLE.bgColor;
      roundedRect(ctx, b.x, b.y, b.w, b.h, BLOCK_STYLE.cornerRadius);
      ctx.font=BLOCK_STYLE.textFont;
      ctx.fillStyle=b.caught? BLOCK_STYLE.caughtText : BLOCK_STYLE.textColor;
      ctx.fillText(b.label, b.x + b.w/2, b.y + b.h/2 + 1);
    } else {
      ctx.fillStyle = b.caught ? "rgba(255,255,255,0.15)" : b.color;
      roundedRect(ctx, b.x, b.y, b.w, b.h, 14);
      ctx.font="600 18px Segoe UI, Inter, sans-serif";
      ctx.fillStyle = b.caught ? "rgba(255,255,255,0.55)" : b.textColor;
      ctx.fillText(b.label, b.x + b.w/2, b.y + b.h/2 + 1);
    }
  });

  if (bossActive) updateBoss(ts);

  // Collision
  blocks.forEach(b=>{
    if(!b.caught &&
       b.y + b.h >= paddleY &&
       b.y <= paddleY + DIFFICULTY.paddleHeight &&
       b.x + b.w >= paddleX &&
       b.x <= paddleX + DIFFICULTY.paddleWidth) {
      b.caught=true;
      flashBG(EFFECTS.catchFlash);
      if(!bossActive){
        score++;
        spawnInterval = Math.max(
          DIFFICULTY.minSpawnInterval,
            DIFFICULTY.baseSpawnInterval - score*DIFFICULTY.scoreSpawnReduction
        );
      } else {
        bossHealth -= BOSS_CONFIG.damagePerCatch;
        score += BOSS_CONFIG.damagePerCatch;
        if (bossHealth <= 0){
          bossHealth=0;
          endGame(true);
        } else {
          const dmgDone = BOSS_CONFIG.health - bossHealth;
            if (dmgDone % BOSS_CONFIG.dropIntervalReduceEvery === 0){
              bossDropInterval = Math.max(
                BOSS_CONFIG.dropIntervalMin,
                bossDropInterval - BOSS_CONFIG.dropIntervalReduceAmount
              );
            }
        }
      }
    }
  });

  // Miss handling
  for(let i=blocks.length-1;i>=0;i--){
    const b=blocks[i];
    if(b.y > canvas.height + 60){
      if(!b.caught){
        lives--;
        flashBG(EFFECTS.missFlash);
        if (lives <= 0) {
          endGame(false);
        }
      }
      blocks.splice(i,1);
    }
  }

  // Paddle
  ctx.fillStyle='#ffffff';
  ctx.fillRect(paddleX, paddleY, DIFFICULTY.paddleWidth, DIFFICULTY.paddleHeight);

  updateHUD();
  if (gameActive && !nukeTriggered) {
    rafId=requestAnimationFrame(gameLoop);
  }
}

function updateHUD(){
  let line;
  if (bossActive){
    line = `Boss HP: ${bossHealth}/${BOSS_CONFIG.health}`;
  } else {
    const toGo = Math.max(0, BOSS_CONFIG.triggerScore - score);
    line = `Boss @ ${BOSS_CONFIG.triggerScore} (to go: ${toGo})`;
  }
  hudEl.innerHTML =
    `Score: ${score}${(score>highScore)?' <span style="color:#20d672">(+)':''}`+
    `<br>High: ${highScore}${newHigh?' <span class="tag-new">NEW!</span>':''}`+
    `<br>Lives: ${lives}`+
    `<br>${line}`+
    `<br><span style="opacity:.7">P:Pause Esc:Exit</span>`;
}

function flashBG(color){
  if(!overlayEl || nukeTriggered) return;
  overlayEl.style.background=color;
  clearTimeout(flashBG._t);
  flashBG._t=setTimeout(()=>{
    if(!nukeTriggered) overlayEl.style.background='rgba(0,44,92,0.85)';
  }, EFFECTS.flashDuration);
}

// Event / controls
function onGameKey(e){
  if (nukeTriggered) return;
  if(!gameActive){
    if(e.key==='r'||e.key==='R') startGame();
    else if(e.key==='Escape') exitGame();
    return;
  }
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') paddleX-=55;
  else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') paddleX+=55;
  else if(e.key==='p'||e.key==='P') pauseGame();
  else if(e.key==='Escape') exitGame();
  clampPaddle();
}
function onMouseMove(e){
  if(!gameActive||gamePaused||nukeTriggered) return;
  const rect=canvas.getBoundingClientRect();
  paddleX = (e.clientX-rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
  clampPaddle();
}
function onTouchMove(e){
  if(!gameActive||gamePaused||nukeTriggered) return;
  const t=e.touches[0];
  const rect=canvas.getBoundingClientRect();
  paddleX = (t.clientX-rect.left)/rect.width*canvas.width - DIFFICULTY.paddleWidth/2;
  clampPaddle();
}

function clampPaddle(){
  const m=DIFFICULTY.paddleEdgeMargin;
  if(paddleX < m) paddleX=m;
  if(paddleX + DIFFICULTY.paddleWidth > canvas.width - m)
    paddleX = canvas.width - m - DIFFICULTY.paddleWidth;
}

function resizeCanvas(){
  canvas.width=innerWidth;
  canvas.height=innerHeight;
  clampPaddle();
}

function pauseGame(){
  if(!gameActive || nukeTriggered) return;
  gamePaused=!gamePaused;
  if (gamePaused){
    msgEl.textContent="Paused";
    msgEl.classList.add('show');
  } else {
    msgEl.classList.remove('show');
    lastTs=performance.now();
    rafId=requestAnimationFrame(gameLoop);
  }
}

function exitGame(){
  cancelAnimationFrame(rafId);
  overlayEl.style.display='none';
  showPlayPrompt();
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('keydown', onGameKey);
  gameActive=false;
}

// Export selected for external triggers if needed
export const GameAPI = {
  startGame, endGame, showPlayPrompt
};