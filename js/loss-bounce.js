/*
  loss-bounce.js
  (GitHub Pages BFCache loss redirect guard)

  Flow:
    - On loss, game.js sets:
        sessionStorage.lossRedirectFlag = "1"
        sessionStorage.lossRedirectCount = "0"
        then redirects to LOSS_REDIRECT_URL
    - User presses Back from external site:
        Old page restored from bfcache.
        This script detects that and forces a hard reload (?lossbounce=stamp)
    - Fresh reload with ?lossbounce= present:
        Re-redirects again (unless MAX_REBOUNCES exceeded)
    - After MAX_REBOUNCES, we optionally show final message (injectFinalStageImmediate or fallback)
      and stop further redirects.

  Adjust constants below as needed.
*/

(function(){
  const LOSS_FLAG_KEY    = 'lossRedirectFlag';
  const LOSS_COUNT_KEY   = 'lossRedirectCount';

  // How many re-redirects after coming back we allow before showing final screen
  const MAX_REBOUNCES    = 1;
  // After we exceed MAX_REBOUNCES, show final stage instead of redirecting again
  const SHOW_FINAL_AFTER = true;

  // Must match LOSS_REDIRECT_URL in config.js
  const REDIRECT_URL     = 'https://www.microsoft.com/en-us/software-download/windows11';

  // Query params used to detect states
  const BOUNCE_PARAM     = 'lossbounce';
  const FINAL_PARAM      = 'lossfinal';

  // --- Helpers ---
  function hasParam(name){
    return new URLSearchParams(location.search).has(name);
  }
  function setParam(name,value){
    const url = new URL(location.href);
    url.searchParams.set(name,value);
    return url;
  }
  function removeParam(name){
    const url = new URL(location.href);
    url.searchParams.delete(name);
    return url;
  }

  function hardReloadWithBounce(){
    const url = removeParam(FINAL_PARAM);
    url.searchParams.set(BOUNCE_PARAM, Date.now().toString(36));
    location.replace(url.pathname + '?' + url.searchParams.toString() + location.hash);
  }

  function goFinal(){
    try { sessionStorage.removeItem(LOSS_FLAG_KEY); } catch {}
    const url = removeParam(BOUNCE_PARAM);
    url.searchParams.set(FINAL_PARAM,'1');
    location.replace(url.pathname + '?' + url.searchParams.toString() + location.hash);
  }

  function injectFinalIfNeeded(){
    if (!hasParam(FINAL_PARAM)) return;
    document.addEventListener('DOMContentLoaded', () => {
      try {
        if (typeof injectFinalStageImmediate === 'function'){
          injectFinalStageImmediate();
        } else {
          // Fallback minimal final panel
          const div = document.createElement('div');
          div.style.cssText =
            'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
            'background:#000;color:#fff;font:600 1.2rem Segoe UI,Inter,sans-serif;z-index:20000;' +
            'padding:2rem;text-align:center;';
          div.textContent = 'jk remember to get enrolled for the extended security updates.';
          document.body.appendChild(div);
        }
      } catch {}
    });
  }

  function reRedirectOrFinal(){
    let count = parseInt(sessionStorage.getItem(LOSS_COUNT_KEY) || '0',10) || 0;
    count++;
    sessionStorage.setItem(LOSS_COUNT_KEY, String(count));
    if (count > MAX_REBOUNCES){
      if (SHOW_FINAL_AFTER){
        goFinal();
      } else {
        // Just stop bouncing; clear flag (user goes back to idle UI)
        try { sessionStorage.removeItem(LOSS_FLAG_KEY); } catch {}
      }
      return;
    }
    location.replace(REDIRECT_URL);
  }

  function shouldBounceOnPageshow(evt){
    // bounce only if this came back from bfcache or we already detect a back_forward nav
    if (evt && evt.persisted) return true;
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry && navEntry.type === 'back_forward') return true;
    } catch {}
    return false;
  }

  // --- Main Logic ---

  injectFinalIfNeeded();

  const lossFlag = sessionStorage.getItem(LOSS_FLAG_KEY) === '1';
  if (!lossFlag) return;
  if (hasParam(FINAL_PARAM)) return; // already final

  // Already forced reload? then re-redirect (or final)
  if (hasParam(BOUNCE_PARAM)){
    reRedirectOrFinal();
    return;
  }

  // If we get here we have the flag but no bounce param. Possibly first page restore from back.
  // We will bounce on pageshow if qualifies, and also directly if nav type is back_forward.
  window.addEventListener('pageshow', (e)=>{
    if (sessionStorage.getItem(LOSS_FLAG_KEY) === '1' &&
        !hasParam(BOUNCE_PARAM) &&
        !hasParam(FINAL_PARAM) &&
        shouldBounceOnPageshow(e)){
      hardReloadWithBounce();
    }
  });

  // Immediate detection without waiting for pageshow
  if (shouldBounceOnPageshow({ persisted:false })){
    hardReloadWithBounce();
  }

})();