/* Countdown + progress that triggers disintegration */
import { COUNTDOWN_CONFIG as CC } from './config.js';
import { dateForWallTimeInZone, formatNum, clamp } from './utils.js';

let started = false;
let targetDate, startDate;
let onEOLCallback = ()=>{};

export function initCountdown(onEOL) {
  if (started) return;
  started = true;
  onEOLCallback = onEOL;
  targetDate = dateForWallTimeInZone(CC.target);
  startDate  = dateForWallTimeInZone(CC.progressStart);

  document.getElementById('target-label').textContent =
    targetDate.toLocaleString([], { dateStyle:'full', timeStyle:'short' });

  tick();
  setInterval(tick, CC.tickMs);
}

function tick() {
  const now = new Date();
  updateProgress(now);
  updateCountdown(now);
}

function updateProgress(now){
  if(!CC.realTimeProgress) return;
  const percentEl = document.getElementById('progress-text');
  const total = targetDate - startDate;
  const elapsed = now - startDate;
  let pct = clamp((elapsed/total)*100, 0, 100);
  percentEl.textContent = Math.floor(pct) + "% complete";
}

let eolTriggered = false;
function updateCountdown(now){
  const countdownEl = document.getElementById('countdown');
  let diff = targetDate - now;
  let mode = "remaining";
  if (diff < 0){
    diff = now - targetDate;
    mode = "since";
    if (!eolTriggered) {
      eolTriggered = true;
      onEOLCallback();
    }
  }
  const seconds = Math.floor(diff/1000);
  const d = Math.floor(seconds/86400);
  const h = Math.floor((seconds % 86400)/3600);
  const m = Math.floor((seconds % 3600)/60);
  const s = seconds % 60;
  countdownEl.textContent = mode === "remaining"
    ? `${d}d ${formatNum(h)}h ${formatNum(m)}m ${formatNum(s)}s until Windows 10 End of Support`
    : `${d}d ${formatNum(h)}h ${formatNum(m)}m ${formatNum(s)}s since Windows 10 End of Support`;
}