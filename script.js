/* Windows 10 EOL Blue Screen Style Countdown
   Fan-made. Adjust CONFIG as needed.
*/

const CONFIG = {
  targetDateUTC: "2025-10-14T00:00:00Z",
  progressStartUTC: "2024-10-14T00:00:00Z", // 1 year window
  tickInterval: 1000,
  qrText: "https://aka.ms/windows-upgrade|Stay Secure After Windows 10 EOL",
  // Optional milestone lines that temporarily override primary
  milestonePercents: [
    { pct: 10, text: "Collecting deprecated APIs..." },
    { pct: 25, text: "Archiving update history..." },
    { pct: 50, text: "Halfway through the farewell buffer..." },
    { pct: 75, text: "Checking upgrade readiness (imaginary)..." },
    { pct: 90, text: "Optimizing nostalgia..." },
    { pct: 99, text: "Finalizing goodbye packets..." }
  ]
};

const els = {
  percent: document.getElementById("percentNum"),
  d: document.getElementById("d"),
  h: document.getElementById("h"),
  m: document.getElementById("m"),
  s: document.getElementById("s"),
  primaryMsg: document.getElementById("primaryMsg"),
  timerHeading: document.getElementById("timerHeading"),
  footerNote: document.getElementById("footerNote"),
  targetLabel: document.getElementById("targetLabel"),
  qrCanvas: document.getElementById("qr"),
  screen: document.getElementById("screen")
};

const targetDate = new Date(CONFIG.targetDateUTC);
const startDate = new Date(CONFIG.progressStartUTC);
els.targetLabel.textContent = targetDate.toLocaleString([], { dateStyle: "full", timeStyle: "short" });

// --- Simple QR generator (very small pseudo-QR / NOT standards-compliant) ---
// For a real QR, you could import a lib. This draws a deterministic block pattern.
// The idea is to have a BSOD-like QR visual without external files.
function drawPseudoQR(text) {
  const c = els.qrCanvas.getContext("2d");
  const size = els.qrCanvas.width;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, size, size);
  // Hash
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  const cells = 33;
  const cellSize = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Finder patterns
      const fp = (x < 7 && y < 7) || (x > cells - 8 && y < 7) || (x < 7 && y > cells - 8);
      if (fp) {
        // Outer square
        if (
          x === 0 || y === 0 || x === 6 || y === 6 ||
          x === cells - 7 || x === cells - 1 && y < 7 ||
          y === cells - 7 || y === cells - 1 && x < 7
        ) {
          c.fillStyle = "#000";
        } else {
          c.fillStyle = (x === 2 || y === 2 || x === 4 || y === 4) ? "#000" : "#fff";
        }
      } else {
        // Mixed pseudo randomness
        h = (h ^ (h << 13)) >>> 0;
        h = (h ^ (h >>> 17)) >>> 0;
        h = (h ^ (h << 5)) >>> 0;
        const bit = (h >> 3) & 1;
        c.fillStyle = bit ? "#000" : "#fff";
      }
      c.fillRect(x * cellSize, y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
    }
  }
  // White margin
  c.globalCompositeOperation = "destination-over";
  c.fillStyle = "#fff";
  c.fillRect(0,0,size,size);
  c.globalCompositeOperation = "source-over";
}
drawPseudoQR(CONFIG.qrText);

// --- Progress & Countdown Logic ---
let lastMilestoneIndex = -1;

function pad(n) { return n.toString().padStart(2,"0"); }

function checkMilestone(pct) {
  for (let i = 0; i < CONFIG.milestonePercents.length; i++) {
    if (pct >= CONFIG.milestonePercents[i].pct && i > lastMilestoneIndex) {
      lastMilestoneIndex = i;
      transientPrimary(CONFIG.milestonePercents[i].text);
      break;
    }
  }
}

let primaryTimeout = null;
const basePrimary = els.primaryMsg.textContent;

function transientPrimary(text) {
  clearTimeout(primaryTimeout);
  els.primaryMsg.style.opacity = 0;
  setTimeout(() => {
    els.primaryMsg.textContent = text;
    els.primaryMsg.style.opacity = 1;
  }, 180);
  // After 6s revert (unless EOL)
  primaryTimeout = setTimeout(() => {
    if (new Date() < targetDate) {
      els.primaryMsg.style.opacity = 0;
      setTimeout(() => {
        els.primaryMsg.textContent = basePrimary;
        els.primaryMsg.style.opacity = 1;
      }, 180);
    }
  }, 6000);
}

function update() {
  const now = new Date();
  const elapsed = now - startDate;
  const total = targetDate - startDate;
  const remaining = targetDate - now;

  let pct = (elapsed / total) * 100;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  els.percent.textContent = Math.floor(pct);

  if (remaining > 0) {
    const sec = Math.floor(remaining / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    els.d.textContent = d;
    els.h.textContent = pad(h);
    els.m.textContent = pad(m);
    els.s.textContent = pad(s);
    checkMilestone(pct);
  } else {
    // EOL reached
    els.d.textContent = "00";
    els.h.textContent = "00";
    els.m.textContent = "00";
    els.s.textContent = "00";
    document.documentElement.classList.add("eol-reached");

    els.primaryMsg.textContent =
      "Support period concluded. Windows 10 has reached End of Support. This screen will now track time since EOL.";
    els.timerHeading.textContent = "Time since End of Support:";
    // Convert to time-since mode
    clearInterval(timer);
    setInterval(updateSince, CONFIG.tickInterval);
  }
}

function updateSince() {
  const now = new Date();
  const diff = now - targetDate;
  const sec = Math.floor(diff / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  els.d.textContent = d;
  els.h.textContent = pad(h);
  els.m.textContent = pad(m);
  els.s.textContent = pad(s);
  els.percent.textContent = 100;
}

const timer = setInterval(update, CONFIG.tickInterval);
update();