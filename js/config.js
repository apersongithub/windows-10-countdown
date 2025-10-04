/* Central configuration & tweak points */

export const REQUIRE_PERFECT_VICTORY = true; // Set false to allow any win (even with lost lives) without forced upgrade.

export const TIME_ZONE = 'America/New_York';

// Countdown / Disintegration
export const COUNTDOWN_CONFIG = {
  progressStart: { y: 2024, m: 10, d: 4, h: 0, min: 0, s: 0 },
  target:        { y: 2025, m: 10, d: 4, h: 15, min: 35, s: 0 },
  tickMs: 1000,
  realTimeProgress: true
};

export const DISINTEGRATION_CONFIG = {
  spread: 200,
  rise: 260,
  durationCharMin: 1200,
  durationCharMax: 2300,
  dotMultiplier: 2,
  stageDelayMs: 3600,
  questionHoldMs: 1700,
  finalMessage: "jk remember to get the extended security update.",
  easing: "cubic-bezier(.25,.6,.3,1)",
  qrDotDensity: 7
};

// Game config
export const HIGH_SCORE_KEY = 'defendUpdatesHighScore_modular';

export const SIZE_TIERS = [
  { label:'4KB',    speedFactor:1.55 },
  { label:'16KB',   speedFactor:1.42 },
  { label:'64KB',   speedFactor:1.30 },
  { label:'256KB',  speedFactor:1.18 },
  { label:'1MB',    speedFactor:1.05 },
  { label:'16MB',   speedFactor:0.95 },
  { label:'128MB',  speedFactor:0.88 },
  { label:'1GB',    speedFactor:0.80 },
  { label:'5GB',    speedFactor:0.72 }
];

// Boss hazards with new "ads" + extras easily removable
export const HAZARDS = [
  { label:"inconsistent design", class:"fast",    color:"#ffbf3c", text:"#2c1b00" },
  { label:"forced updates",      class:"fast",    color:"#ff6b2d", text:"#2d1300" },
  { label:"bsod",                class:"fast",    color:"#1e90ff", text:"#ffffff" },
  { label:"ai crap",             class:"extreme", color:"#b800ff", text:"#ffffff" },
  { label:"bad troubleshooter",  class:"fast",    color:"#ff4d6d", text:"#2c000b" },
  { label:"bad search function", class:"extreme", color:"#ff2f2f", text:"#2c0000" },
  { label:"get edge",            class:"extreme", color:"#00c17c", text:"#003524" },
  { label:"ads",                 class:"extreme", color:"#ff9f00", text:"#241400" },
  // Optional extras (comment out if not wanted)
  { label:"telemetry",           class:"fast",    color:"#74c0ff", text:"#071d2a" },
  { label:"widgets nag",         class:"fast",    color:"#00b2ff", text:"#002333" }
];

export const HAZARD_SPEED = { fast:1.0, extreme:1.5 };

export const DIFFICULTY = {
  baseSpawnInterval: 950,
  minSpawnInterval: 230,
  scoreSpawnReduction: 7,
  baseSpeedRange: [140, 260],
  scoreSpeedFactor: 0.02,
  paddleWidth: 150,
  paddleHeight: 18,
  paddleEdgeMargin: 32,
  lives: 5
};

export const BLOCK_STYLE = {
  textFont: "600 17px Segoe UI, Inter, sans-serif",
  textColor: "#0078d7",
  bgColor: "#ffffff",
  caughtColor: "rgba(255,255,255,0.18)",
  caughtText: "rgba(255,255,255,0.55)",
  cornerRadius: 6
};

export const EFFECTS = {
  missFlash: "rgba(255,60,60,0.35)",
  catchFlash: "rgba(100,255,160,0.33)",
  flashDuration: 140
};

export const BOSS_CONFIG = {
  triggerScore: 100,
  health: 60,
  width: 420,
  height: 76,
  topY: 80,
  moveAmplitude: 280,
  moveSpeed: 0.55,
  dropIntervalStart: 820,
  dropIntervalMin: 320,
  dropIntervalReduceEvery: 10,
  dropIntervalReduceAmount: 50,
  dropSpeedRange: [260, 380],
  damagePerCatch: 1,
  label: 'MICROSOFT'
};

export const NUKE_CONFIG = {
  spinnerIncrementBase: 0.035,
  spinnerRandomAdd: 1.0,
  minStep: 0.25,
  intervalMin: 220,
  intervalRand: 260
};