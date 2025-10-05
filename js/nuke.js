/* Simplified static "Windows 11 upgrade" overlay + return-to-game controls */
let nukeActive = false;

function ensureOverlay() {
  let overlay = document.getElementById('nuke-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nuke-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <h2 id="nuke-title">Upgrading to <span class="accent">Windows 11</span>...</h2>
      <div id="nuke-reason">Reason: (placeholder)</div>
      <p id="nuke-text">
        Migration in progress. Your classic edges, square corners, and comfortable muscle memory
        are being carefully <em>modernized</em>. Please do not power off your nostalgia.
      </p>
      <div id="nuke-actions"></div>
      <p class="small-note">Parody screen – no real upgrade is happening.</p>
    `;
    document.body.appendChild(overlay);
  }

  const title     = overlay.querySelector('#nuke-title')    || createChild(overlay,'h2','nuke-title');
  const reasonBox = overlay.querySelector('#nuke-reason')   || createChild(overlay,'div','nuke-reason');
  const textEl    = overlay.querySelector('#nuke-text')     || createChild(overlay,'p','nuke-text');
  let actions     = overlay.querySelector('#nuke-actions');

  if (!actions) {
    actions = document.createElement('div');
    actions.id = 'nuke-actions';
    overlay.insertBefore(actions, overlay.querySelector('.small-note'));
  }

  // Build action buttons if not present
  if (!actions.dataset.built) {
    actions.innerHTML = `
      <button type="button" class="nuke-btn" id="nuke-replay">Play Again (G)</button>
      <button type="button" class="nuke-btn" id="nuke-infinite">Infinite Mode (I)</button>
      <button type="button" class="nuke-btn" id="nuke-close">Close</button>
    `;
    actions.dataset.built = '1';

    actions.querySelector('#nuke-replay').addEventListener('click', () => {
      hideOverlay();
      window.dispatchEvent(new CustomEvent('nuke:retry'));
    });
    actions.querySelector('#nuke-infinite').addEventListener('click', () => {
      hideOverlay();
      window.dispatchEvent(new CustomEvent('nuke:infinite'));
    });
    actions.querySelector('#nuke-close').addEventListener('click', () => {
      window.location.href = 'https://www.microsoft.com/en-us/software-download/windows11';
    });

    // Key shortcuts while overlay visible
    window.addEventListener('keydown', e => {
      if (overlay.style.display !== 'flex') return;
      if (e.key === 'g' || e.key === 'G') {
        hideOverlay();
        window.dispatchEvent(new CustomEvent('nuke:retry'));
      } else if (e.key === 'i' || e.key === 'I') {
        hideOverlay();
        window.dispatchEvent(new CustomEvent('nuke:infinite'));
      } else if (e.key === 'Escape') {
        hideOverlay();
        window.dispatchEvent(new CustomEvent('nuke:close'));
      }
    });
  }

  return { overlay, title, reasonBox, textEl };
}

function createChild(parent, tag, id) {
  const el = document.createElement(tag);
  el.id = id;
  parent.appendChild(el);
  return el;
}

function hideOverlay() {
  const overlay = document.getElementById('nuke-overlay');
  if (overlay) overlay.style.display = 'none';
  nukeActive = false;
}

/**
 * Show static upgrade overlay (no progress)
 * @param {string} reason - reason string
 */
export function triggerNuke(reason) {
  if (nukeActive) return;
  nukeActive = true;

  const { overlay, title, reasonBox, textEl } = ensureOverlay();

  const lower = (reason || '').toLowerCase();
  const extra =
    lower.includes('collapsed') ? 'You need to protect your PC better.' :
    lower.includes('purity')    ? 'Try harder next time.' :
    'Manual override engaged.';

  title.textContent = 'Upgrading to Windows 11...';
  reasonBox.textContent = `Reason: ${reason}`;
  textEl.innerHTML = `${extra}<br><br>ur a loser haha`;

  overlay.style.display = 'flex';
}