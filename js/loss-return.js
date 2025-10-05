/*
  loss-return.js
  Purpose: After a loss redirect, when the player presses Back from the external site,
  show a final message instead of resuming the frozen game state.
*/

(function(){
  const FLAG_KEY = 'lossRedirectTimestamp';

  // Quick navigator back/forward detection
  function isBackForwardNav(){
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav && nav.type === 'back_forward';
    } catch {
      return false;
    }
  }

  // If no flag, nothing to do.
  const hadFlag = sessionStorage.getItem(FLAG_KEY);
  if (!hadFlag) return;

  // We only convert to final page on a back/forward restore (BFCache) or persisted pageshow.
  // If user refreshed instead, we let normal startup proceed (they can play again).
  let shouldShowFinalImmediately = false;

  if (isBackForwardNav()) {
    shouldShowFinalImmediately = true;
  }

  // pageshow handler catches BFCache restores (persisted true).
  window.addEventListener('pageshow', (e)=>{
    if (!sessionStorage.getItem(FLAG_KEY)) return; // already handled or cleared
    if (e.persisted) {
      showFinal();
    }
  });

  if (shouldShowFinalImmediately) {
    showFinal();
  }

  function showFinal(){
    // Clear the flag so refreshing returns to normal flow
    try { sessionStorage.removeItem(FLAG_KEY); } catch {}

    // Try to freeze any lingering game loop (in case not already frozen)
    try {
      if (window.cancelAnimationFrame && window.rafId) cancelAnimationFrame(window.rafId);
      if (window.unbindGameListeners) window.unbindGameListeners();
    } catch {}

    // Remove/hide game overlay & HUD if present to avoid flicker
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.style.display = 'none';
    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = 'none';
    const playPrompt = document.getElementById('play-prompt');
    if (playPrompt) playPrompt.style.display = 'none';

    // Inject final screen
    const finalDiv = document.createElement('div');
    finalDiv.id = 'loss-final-screen';
    finalDiv.style.cssText = `
      position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:#000; color:#fff; z-index:99999; font:600 clamp(1rem,2.2vw,1.4rem) Segoe UI,Inter,sans-serif;
      padding:2.5rem; text-align:center; line-height:1.5; letter-spacing:.5px;
    `;
    finalDiv.innerHTML = `
      <div style="max-width:840px;">
        <p style="margin:0 0 1.2rem;font-weight:400;font-size:clamp(1.2rem,3.4vw,2.4rem);">
          jk remember to get enrolled for the extended security updates.
        </p>
        <p style="margin:0 0 2rem;opacity:.7;font-size:.85em;">
          (You were redirected due to a failed defense. Press the button below to start fresh.)
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;">
          <button id="loss-start-btn" style="
            background:#0a84ff;border:0;color:#fff;padding:.75rem 1.4rem;cursor:pointer;
            font:600 .8rem Segoe UI,Inter,sans-serif;border-radius:8px;letter-spacing:.7px;
          ">Start Again (G)</button>
          <button id="loss-reload-btn" style="
            background:#444;border:0;color:#fff;padding:.75rem 1.4rem;cursor:pointer;
            font:600 .8rem Segoe UI,Inter,sans-serif;border-radius:8px;letter-spacing:.7px;
          ">Reload Page</button>
        </div>
        <p style="margin:2rem 0 0;opacity:.4;font-size:.65em;">Press G anytime or click the button.</p>
      </div>
    `;
    document.body.appendChild(finalDiv);

    // Bind buttons
    finalDiv.querySelector('#loss-reload-btn').addEventListener('click', () => {
      location.reload();
    });
    finalDiv.querySelector('#loss-start-btn').addEventListener('click', startFresh);

    // Key shortcut (G)
    window.addEventListener('keydown', function onKey(e){
      if (e.key === 'g' || e.key === 'G'){
        startFresh();
        window.removeEventListener('keydown', onKey);
      }
    });

    function startFresh(){
      try {
        const screen = document.getElementById('loss-final-screen');
        if (screen) screen.remove();
      } catch {}
      // Show play prompt or start directly if desired
      try {
        if (window.GameAPI && typeof window.GameAPI.startGame === 'function') {
          window.GameAPI.startGame();
        } else {
          // fallback: just reload if API not ready
          location.reload();
        }
      } catch {
        location.reload();
      }
    }
  }
})();