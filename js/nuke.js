/* Windows 11 forced upgrade overlay (spinner) */
import { NUKE_CONFIG as NC } from './config.js';

let nukeActive = false;

export function triggerNuke(reason) {
  if (nukeActive) return;
  nukeActive = true;

  const overlay = document.getElementById('nuke-overlay');
  const title = document.getElementById('nuke-title');
  const text = document.getElementById('nuke-text');
  const label = document.getElementById('nuke-progress-label');

  title.textContent = "Upgrading to Windows 11...";
  text.innerHTML = `${reason}<br>Centering taskbar. Injecting rounded corners.`;

  overlay.style.display='flex';

  let pct = 0;
  (function advance(){
    if (pct >= 100) {
      label.textContent="Upgrade simulation complete.";
      return;
    }
    const delta = Math.max(NC.minStep, (100 - pct) * NC.spinnerIncrementBase) + Math.random()*NC.spinnerRandomAdd;
    pct = Math.min(100, pct + delta);
    label.textContent = `${Math.floor(pct)}% complete`;
    setTimeout(advance, NC.intervalMin + Math.random()*NC.intervalRand);
  })();
}