/* Bootstraps countdown, disintegration, and game with EOL gate & persistent unlock */
import { initCountdown } from './countdown.js';
import { runDisintegration, injectFinalStageImmediate } from './disintegration.js';
import { initGame, startGame, startInfiniteGame, showPlayPrompt } from './game.js';
import { COUNTDOWN_CONFIG, LS_KEYS, PERSIST_UNLOCK_BEFORE_EOL } from './config.js';
import { dateForWallTimeInZone } from './utils.js';
/* === Loss Redirect Return Guard ===
   If we come back (Back button) after a loss redirect, show final stage instead of resuming a dead game.
*/
(function setupLossReturnGuard(){
  function handleLossReturn(){
    if (sessionStorage.getItem('lossRedirected') === '1'){
      // Clear the flag so a manual refresh doesn’t keep forcing this
      try { sessionStorage.removeItem('lossRedirected'); } catch {}
      // Inject final stage message
      try { injectFinalStageImmediate(); } catch {}
      // Stop any lingering loops (in case BFCache revived state)
      if (window.cancelAnimationFrame && window.rafId) {
        try { cancelAnimationFrame(window.rafId); } catch {}
      }
      // Show play prompt (if the countdown already unlocked)
      try { showPlayPrompt(); } catch {}
      // Optionally also mark unlocked if you want to skip countdown gating:
      // gameUnlocked = true;
    }
  }
  // Run now (normal reload) and also on pageshow (BFCache restore)
  handleLossReturn();
  window.addEventListener('pageshow', handleLossReturn);
})();
/* -------------------- Nuke Overlay -------------------- */
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

/* Nuke overlay event hooks (if present from earlier version) */
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

/* ==== INSERT KEY COUNTDOWN BYPASS PATCH ==== */
/*
  Features:
  - Press Insert (Ins) to skip the Windows 10 countdown and start immediately.
  - Only runs once; subsequent presses ignored.
  - Tries optional helper hooks (cancelCountdown, hideCountdownUI) if they exist.
  - Respects ENABLE_INSERT_BYPASS (defaults to true if missing).
*/

/* Minimal Insert bypass:
   Press Insert -> mark postStage as done -> reload (countdown skipped on next load)
*/
/* ===== Minimal Insert Skip (kept, but harmonized with LS_KEYS.postStage) ===== */
(function () {
  // Prefer configured key if available
  const CONFIG_KEY = (typeof LS_KEYS !== 'undefined' && LS_KEYS.postStage) ? LS_KEYS.postStage : 'defendUpdatesPostStage';
  const KEY = CONFIG_KEY;

  function skipCountdownAndReload() {
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      console.warn('[InsertBypassMinimal] Could not write localStorage', e);
    }
    // Use replace + cache buster to minimize stale state
    const base = location.origin + location.pathname;
    location.replace(base + '?skip=' + Date.now());
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Insert' || e.code === 'Insert' || e.key === 'Ins') {
      // Let the more advanced patch (below) handle if it already hijacked (guard with flag)
      if (window.__advancedBypassActive) return;
      e.preventDefault();
      skipCountdownAndReload();
    }
  });

  window._forceSkipCountdown = skipCountdownAndReload;
})();

/* ==== INSERT (skip) + DELETE (reset data) HOTKEY PATCH (SAFE) ====
   - Insert: bypass countdown & start game immediately (no reload needed here)
   - Delete: clear game data THEN reload with cache-busting param
   - Minimal intrusion: does NOT touch other countdown code unless keys pressed
*/
(function(){
  const ENABLE_INSERT_BYPASS = true;
  const ENABLE_DELETE_RESET  = true;
  const SHOW_HINT            = true;
  const USE_SELECTIVE_CLEAR  = true;   // false => full localStorage.clear()
  const CLEAR_PREFIX         = '';     // Optional: e.g. 'defendUpdates' to limit cleared keys

  // Mark so the minimal handler knows not to double-fire
  window.__advancedBypassActive = true;

  // Consistent post stage key
  const POST_STAGE_KEY = (typeof LS_KEYS !== 'undefined' && LS_KEYS.postStage) ? LS_KEYS.postStage : 'defendUpdatesPostStage';

  function liveKeysToClear() {
    if (!USE_SELECTIVE_CLEAR) return []; // we'll full-clear
    const list = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (CLEAR_PREFIX && !k.startsWith(CLEAR_PREFIX) && k !== POST_STAGE_KEY) continue;
      list.push(k);
    }
    // Ensure post stage key always included
    if (!list.includes(POST_STAGE_KEY)) list.push(POST_STAGE_KEY);
    return list;
  }

  function selectiveClear() {
    if (!USE_SELECTIVE_CLEAR) {
      try { localStorage.clear(); } catch {}
      return;
    }
    const keys = liveKeysToClear();
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  }

  function hideCountdownUI() {
    const cdEls = document.querySelectorAll('[data-countdown], .countdown-overlay, #countdown, #win10-countdown');
    cdEls.forEach(el => el.style.display='none');
  }

  let bypassed = false;
  function bypassCountdownAndStart(mode='boss'){
    if (bypassed) return;
    bypassed = true;

    // Set post-stage flag so the main flow treats countdown as finished
    try { localStorage.setItem(POST_STAGE_KEY, '1'); } catch {}

    if (typeof cancelCountdown === 'function') {
      try { cancelCountdown(); } catch {}
    } else {
      hideCountdownUI();
    }
    hideCountdownUI();

    // Call main game starters (from already-imported context)
    if (mode === 'infinite' && typeof startInfiniteGame === 'function') {
      startInfiniteGame();
    } else if (typeof startGame === 'function') {
      startGame();
    } else {
      console.warn('[Hotkeys] startGame not found.');
    }
  }

  async function resetDataAndReload() {
    if (!confirm('Reset ALL saved game data and restart countdown?')) return;

    selectiveClear();

    // Force-remove post stage key again in case of repopulation
    try { localStorage.removeItem(POST_STAGE_KEY); } catch {}

    // Two animation frames to allow any pending synchronous listeners to finish
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const base = location.origin + location.pathname;
    location.replace(base + '?reset=' + Date.now());
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;

    const isInsert = (e.key === 'Insert' || e.code === 'Insert' || e.key === 'Ins');
    const isDelete = (e.key === 'Delete' || e.code === 'Delete');

    if (ENABLE_INSERT_BYPASS && isInsert) {
      e.preventDefault();
      // Use in-page bypass (no reload) so we don't risk breaking the countdown pipe
      bypassCountdownAndStart('boss');
    }

    if (ENABLE_DELETE_RESET && isDelete) {
      e.preventDefault();
      resetDataAndReload();
    }
  }, { capture: true });

  function addHint() {
    if (!SHOW_HINT) return;
    const ID = 'countdown-hotkey-hint';
    if (document.getElementById(ID)) return;
    const div = document.createElement('div');
    div.id = ID;
    div.textContent = 'Ins/Double Tap QR: Skip countdown  •  Delete: Reset data';
    div.style.cssText = `
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
    `;
    document.body.appendChild(div);
    setTimeout(()=>{ div.style.transition='opacity .7s'; div.style.opacity='0'; }, 3000);
    setTimeout(()=>{ if(div.parentNode) div.remove(); }, 16000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addHint);
  } else {
    addHint();
  }

  // Console helpers
  window._skipCountdownNow = () => bypassCountdownAndStart('boss');
  window._resetGameData    = resetDataAndReload;
})();

/* === Double‑Tap (or rapid double click) on #qr-image => Skip Countdown (Insert equivalent) === */
(function enableQrDoubleTapSkip() {
  const EL_ID = 'qr-image';
  const POST_STAGE_KEY = (typeof LS_KEYS !== 'undefined' && LS_KEYS.postStage)
    ? LS_KEYS.postStage
    : 'defendUpdatesPostStage';

  // Timing / movement thresholds
  const DOUBLE_TAP_MS   = 340;
  const MIN_INTERVAL_MS = 50;   // ignore ultra-fast ghost taps
  const MOVE_TOLERANCE  = 28;   // px finger drift allowed

  let lastTime = 0;
  let lastX = 0;
  let lastY = 0;

  function doSkip() {
    // Prefer in‑page bypass (no reload)
    if (typeof window._skipCountdownNow === 'function') {
      window._skipCountdownNow();
      return;
    }
    // Next: minimal force skip (reload)
    if (typeof window._forceSkipCountdown === 'function') {
      window._forceSkipCountdown();
      return;
    }
    // Fallback: set flag & reload (cache-busted)
    try { localStorage.setItem(POST_STAGE_KEY, '1'); } catch {}
    const base = location.origin + location.pathname;
    location.replace(base + '?skip=' + Date.now());
  }

  function isDoubleTap(ev) {
    const now = performance.now();
    let x, y;
    if (ev.changedTouches && ev.changedTouches.length) {
      const t = ev.changedTouches[0];
      x = t.clientX;
      y = t.clientY;
    } else {
      x = ev.clientX;
      y = ev.clientY;
    }
    const dt = now - lastTime;
    const dx = Math.abs(x - lastX);
    const dy = Math.abs(y - lastY);
    lastTime = now;
    lastX = x;
    lastY = y;
    return (dt > MIN_INTERVAL_MS && dt < DOUBLE_TAP_MS && dx < MOVE_TOLERANCE && dy < MOVE_TOLERANCE);
  }

  function attach(el) {
    if (!el || el.__qrSkipBound) return;
    el.__qrSkipBound = true;

    const handler = (ev) => {
      // Ignore multi-touch (pinch zoom, etc.)
      if (ev.touches && ev.touches.length > 1) return;
      if (isDoubleTap(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
        doSkip();
      }
    };

    // Pointer events preferred; fallback to touchend/mouseup
    if (window.PointerEvent) {
      el.addEventListener('pointerup', handler, { passive: false });
    } else {
      el.addEventListener('touchend', handler, { passive: false });
      el.addEventListener('mouseup', handler);
    }
  }

  function init() {
    const el = document.getElementById(EL_ID);
    if (el) {
      attach(el);
    } else {
      // If it may appear slightly later, observe briefly
      const obs = new MutationObserver(() => {
        const found = document.getElementById(EL_ID);
        if (found) {
          attach(found);
          obs.disconnect();
        }
      });
      try {
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(()=>obs.disconnect(), 5000);
      } catch {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();