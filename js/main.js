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
(function () {
  const KEY = 'defendUpdatesPostStage';

  function skipCountdownAndReload() {
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      console.warn('[InsertBypassMinimal] Could not write localStorage', e);
    }
    location.reload();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Insert' || e.code === 'Insert' || e.key === 'Ins') {
      e.preventDefault();
      skipCountdownAndReload();
    }
  });

  // Optional: expose manually in console
  window._forceSkipCountdown = skipCountdownAndReload;
})();

/* ==== INSERT (skip) + DELETE (reset data) HOTKEY PATCH ====
   - Insert: bypass countdown and start game immediately (boss mode by default)
   - Delete: clear stored game data (selective) then reload to normal countdown
   - No extra buttons / minimal CSS
*/

(function(){
  const ENABLE_INSERT_BYPASS = true;  // set false to disable Insert hotkey
  const ENABLE_DELETE_RESET  = true;  // set false to disable Delete reset
  const SHOW_HINT            = true;  // set false to hide on‑screen hint
  const USE_SELECTIVE_CLEAR  = true;  // false => full localStorage.clear()

  // Known keys (adjust if you renamed them)
  const LS_KEYS_TO_CLEAR = [];
  for (let i = 0; i < localStorage.length; i++) {
    LS_KEYS_TO_CLEAR.push(localStorage.key(i));
  }

  let bypassed = false;

  function selectiveClear() {
    if (!USE_SELECTIVE_CLEAR) {
      try { localStorage.clear(); } catch {}
      return;
    }
    LS_KEYS_TO_CLEAR.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  }

  function hideCountdownUI() {
    // Attempt to hide common countdown elements; adjust selectors as needed
    const cdEls = document.querySelectorAll(
      '[data-countdown], .countdown-overlay, #countdown, #win10-countdown'
    );
    cdEls.forEach(el => el.style.display='none');
  }

  function bypassCountdownAndStart(mode='boss'){
    if (bypassed) return;
    bypassed = true;

    if (typeof cancelCountdown === 'function') {
      try { cancelCountdown(); } catch {}
    } else {
      hideCountdownUI();
    }

    hideCountdownUI();

    if (mode === 'infinite' && typeof startInfiniteGame === 'function') {
      startInfiniteGame();
    } else if (typeof startGame === 'function') {
      startGame();
    } else {
      console.warn('[Hotkeys] startGame not found.');
    }
  }

  function resetDataAndReload() {
    if (!confirm('Reset all saved game data and countdown?')) return;
    selectiveClear();
    location.reload();
  }

  // Hotkeys
  window.addEventListener('keydown', (e) => {
    // Avoid triggering while typing in inputs
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;

    if (ENABLE_INSERT_BYPASS && (e.key === 'Insert' || e.code === 'Insert' || e.key === 'Ins')) {
      e.preventDefault();
      bypassCountdownAndStart('boss'); // change to 'infinite' if you prefer
    }
    if (ENABLE_DELETE_RESET && (e.key === 'Delete' || e.code === 'Delete')) {
      e.preventDefault();
      resetDataAndReload();
    }
  });

  // Minimal on‑screen hint
  function addHint() {
    if (!SHOW_HINT) return;
    const ID = 'countdown-hotkey-hint';
    if (document.getElementById(ID)) return;

    const div = document.createElement('div');
    div.id = ID;
    div.textContent = 'Insert: Skip countdown  •  Delete: Reset data';
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
      max-width:260px;
      text-align:center;
      line-height:1.25;
    `;
    document.body.appendChild(div);

    // Fade out after some time (optional)
    setTimeout(()=>{ div.style.transition='opacity .7s'; div.style.opacity='0'; }, 3000);
    setTimeout(()=>{ if(div.parentNode) div.remove(); }, 16000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addHint);
  } else {
    addHint();
  }

  // Expose for console
  window._skipCountdownNow = () => bypassCountdownAndStart('boss');
  window._resetGameData    = resetDataAndReload;
})();