/* Bootstraps countdown, disintegration, and game */
import { initCountdown } from './countdown.js';
import { runDisintegration } from './disintegration.js';
import { initGame, startGame, showPlayPrompt } from './game.js';

const playPromptEl = document.getElementById('play-prompt');

function onEOL() {
  // Delay a bit then disintegrate everything
  setTimeout(()=>{
    runDisintegration().then(()=>{
      // After final stage message, allow game
      showPlayPrompt();
    });
  }, 600);
}

initGame();
initCountdown(onEOL);

playPromptEl.addEventListener('click', ()=> startGame());
window.addEventListener('keydown', e=>{
  if (playPromptEl.style.display !== 'none' && (e.key==='g' || e.key==='G')) {
    startGame();
  }
});