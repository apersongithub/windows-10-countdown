/* Central configuration & tweak points */

export const REQUIRE_PERFECT_VICTORY = false;
export const TIME_ZONE = 'America/New_York';

export const REDIRECT_ON_LOSS = true;
export const LOSS_REDIRECT_URL = 'https://www.microsoft.com/en-us/software-download/windows11';

export const PERSIST_UNLOCK_BEFORE_EOL = true;

export const ENABLE_RESET_DATA_BUTTON = true;

export const LS_KEYS = {
  postStage: 'defendUpdatesPostStage',
  infinite: 'defendUpdatesInfinite',
  highScore: 'defendUpdatesHighScore_modular',
  tutorial: 'defendUpdatesTutorialShown'
};

export const MUSIC = {
  enabled: true,
  volumeMaster: 0.15,
  tracks: {
    normal:   'audio/music_normal.mp3',
    boss:     'audio/music_boss.mp3',
    infinite: 'audio/music_infinite.mp3'
  },
  fadeInMs: 1200,
  fadeOutMs: 900,
  crossfadeMs: 1600,
  pauseDuckFactor: 0.35,
  resumeFadeMs: 500
};

export const SOUNDWAVE_UNLOCK_KEY = 'defendUpdatesSoundwaveUnlocked';

export const COUNTDOWN_CONFIG = {
  progressStart: { y: 2024, m: 10, d: 14, h: 0, min: 0, s: 0 },
  target:        { y: 2025, m: 10, d: 14, h: 0, min: 0, s: 0 },
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
  finalMessage: "jk remember to get enrolled for the extended security updates.",
  easing: "cubic-bezier(.25,.6,.3,1)",
  qrDotDensity: 7
};

export const LIFE_BLOCK = {
  normalInterval: 25,
  infiniteInterval: 50,
  size: 40,
  speedMultiplier: 4.2,
  color: '#1f8f55',
  textColor: '#ffffff',
  label: '+1',
  maxLives: 5,
  imageSrc: 'static/cortana.png',
  pulseSpeed: 2.2,
  pulseScaleMin: 0.88,
  pulseScaleMax: 1.12,
  glowColor: 'rgba(32,214,114,0.55)',
  innerGlowColor: 'rgba(255,255,255,0.15)',
  outlineColor: 'rgba(255,255,255,0.55)',
  outlineWidth: 2.5,
  iconScale: 0.62,
  showPlusFallback: true
};

export const AUDIO = {
  enabled: true,
  volumeMaster: 0.85,
  perClipVolume: {
    bossDeath: 1.0,
    bossHit: 0.7,
    bossHazardDrop: 0.75,
    catchTiny: 0.9,
    catchBlock: 0.55,
    lifeGain: 0.95,
    lifeMax: 0.6,
    lifeMiss: 0.4,
    miss: 0.9,
    lifeLost: 0.9,
    victory: 0.9,
    flawless: 1.0,
    infiniteUnlock: 0.9,
    nuke: 0.4,
    uiSelect: 0.5,
    uiStart: 0.8,
    bombSpawn: 0.8,
    bombTick: 0.35,
    bombExplode: 1.0,
    snipSpawn: 0.8,
    snipPickup: 0.9,
    snipDragStart: 0.7,
    snipExecute: 1.0,
    snipCancel: 0.6,
    shieldSpawn: 0.8,
    shieldPickup: 0.95,
    shieldExpire: 0.85,
    shieldBlock: 0.75,
    taskmgrSpawn: 0.75,
    taskmgrPickup: 0.95,
    taskmgrExecute: 1.0,
    soundwaveSpawn:  0.85,
    soundwavePickup: 1.0,
    soundwavePulse:  0.9,
    stickySpawn:     0.75,
    stickyHit:       1.0,
    stickyEnd:       0.8
  },
  files: {
    catchBlock:     'audio/catch_block.mp3',
    catchTiny:      'audio/catch_tiny.mp3',
    lifeGain:       'audio/life_gain.mp3',
    lifeMax:        'audio/life_max.mp3',
    lifeMiss:       'audio/life_miss.mp3',
    bossSpawn:      'audio/boss_spawn.mp3',
    bossHit:        'audio/catch_block.mp3',
    bossDeath:      'audio/boss_death.mp3',
    bossDeathFinal: 'audio/boss_death_final.mp3',
    bossHazardDrop: 'audio/pickup.mp3',
    miss:           'audio/miss.mp3',
    gameOver:       'audio/game_over.mp3',
    victory:        'audio/victory.mp3',
    flawless:       'audio/flawless.mp3',
    infiniteUnlock: 'audio/infinite_unlock.mp3',
    nuke:           'audio/nuke.mp3',
    uiSelect:       'audio/ui_select.mp3',
    uiStart:        'audio/ui_start.mp3',
    bombSpawn:      'audio/bomb_spawn.mp3',
    bombTick:       'audio/bomb_tick.mp3',
    bombExplode:    'audio/bomb_explode.mp3',
    snipSpawn:      'audio/snip_spawn.mp3',
    snipPickup:     'audio/pickup.mp3',
    snipDragStart:  'audio/snip_drag_start.mp3',
    snipExecute:    'audio/snip_execute.mp3',
    snipCancel:     'audio/snip_cancel.mp3',
    shieldSpawn:    'audio/shield_spawn.mp3',
    shieldPickup:   'audio/pickup.mp3',
    shieldExpire:   'audio/shield.mp3',
    shieldBlock:    'audio/shield_block.mp3',
    taskmgrSpawn:   'audio/taskmgr_spawn.mp3',
    taskmgrPickup:  'audio/pickup.mp3',
    taskmgrExecute: 'audio/taskmgr_execute.mp3',
    soundwaveSpawn:  'audio/soundwave_spawn.mp3',
    soundwavePickup: 'audio/pickup.mp3',
    soundwavePulse:  'audio/soundwave_pulse.mp3',
    stickySpawn:     'audio/sticky_spawn.mp3',
    stickyHit:       'audio/sticky_hit.mp3',
    stickyEnd:       'audio/sticky_end.mp3'
  }
};

export const TASKBAR_STYLE = {
  enabled: true,
  pixel: 2,
  height: 22,
  padX: 6,
  padY: 3,
  bgTop: '#ffffff',
  bgMid: '#f3f3f3',
  bgBottom: '#eaeaea',
  outline: '#d1d1d1',
  innerLine: '#f9f9f9',
  glow: 'rgba(0,0,0,0.05)',
  iconGap: 6,
  iconSize: 10,
  accentBlue: '#0078d7',
  startRed: '#0063b1',
  startGreen: '#0063b1',
  startBlue: '#0063b1',
  startYellow: '#0063b1',
  textColor: '#2b2b2b'
};

export const BOMB_CONFIG = {
  enabled: true,
  size: 50,
  speedRange: [180, 900],
  spawnIntervalInitial: 4000,
  spawnIntervalMin: 1400,
  spawnIntervalDecayScore: 60,
  baseSpawnInterval: 4800,
  randomJitter: 1400,
  fuseSparkEvery: 120,
  pulseSpeed: 3.2,
  lifeCost: 1,
  respectImmunity: false,
  shakeIntensity: 18,
  shakeDuration: 190,
  colorBody: '#2b2f37',
  colorOutline: '#4b5563',
  colorFuse: '#ffa13d',
  colorSpark: '#ffdd55',
  colorGlow: 'rgba(255,120,40,0.55)',
  imageSrc: 'static/error.png',
  multiSpawnChanceBase: 0.80,
  multiSpawnChanceScoreBoost: 0.30,
  multiSpawnMax: 2,
  maxConcurrent: 4,
  scoreRampForMulti: 120,
  backfillCatchUp: true,
  explosionDuration: 620,
  explosionShardCount: 28,
  explosionShardSpeedRange: [180, 520],
  explosionShardSizeRange: [4, 14]
};

export const SNIP_POWERUP = {
  enabled: true,
  label: 'SNIP',
  imageSrc: 'static/snip.png',
  size: 30,
  color: '#ff3fb1',
  textColor: '#2b0021',
  glow: 'rgba(255,63,177,0.55)',
  pulseSpeed: 3.0,
  spawnIntervalInitial: 20000,
  baseSpawnInterval: 30000,
  spawnIntervalMin: 12000,
  spawnIntervalDecayScore: 200,
  randomJitter: 7000,
  backfillCatchUp: true,
  maxConcurrent: 1,
  aimTimeoutMs: 6500,
  fadeOverlay: 'rgba(0,0,0,0.35)',
  outlineColor: '#ff89d2',
  fillRectColor: 'rgba(255,137,210,0.12)',
  strokeWidth: 2,
  awardScorePerNormal: 1,
  allowBombRemoval: true,
  bombTriggersExplosion: true,
  allowPartialWhileFalling: true,
  screenShakeOnExecute: true,
  executeShakeIntensity: 18,
  executeShakeDuration: 220
};

export const SHIELD_POWERUP = {
  enabled: true,
  label: 'SHD',
  imageSrc: 'static/shield.png',
  size: 34,
  color: '#4aa6ff',
  textColor: '#ffffff',
  glow: 'rgba(80,170,255,0.55)',
  innerGlowColor: 'rgba(255,255,255,0.20)',
  outlineColor: 'rgba(255,255,255,0.65)',
  outlineWidth: 2.2,
  pulseSpeed: 2.6,
  pulseScaleMin: 0.88,
  pulseScaleMax: 1.15,
  iconScale: 0.70,
  showLabelFallback: true,
  durationMs: 5000,
  spawnIntervalInitial: 30000,
  baseSpawnInterval: 40000,
  spawnIntervalMin: 15000,
  spawnIntervalDecayScore: 300,
  randomJitter: 10000,
  backfillCatchUp: true,
  maxConcurrent: 1,
  auraPulseSpeed: 3.5,
  auraColor: 'rgba(110,200,255,0.55)',
  auraTrailColor: 'rgba(110,200,255,0.20)',
  auraRadiusExtra: 18,
  overlayFlashColor: 'rgba(120,200,255,0.10)',
  hudTagColor: '#64c9ff'
};

export const TASKMGR_POWERUP = {
  enabled: true,
  label: 'TM',
  imageSrc: 'static/taskmgr.png',
  size: 50,
  color: '#ffd24d',
  textColor: '#3b2b00',
  glow: 'rgba(255,210,77,0.60)',
  innerGlowColor: 'rgba(255,255,255,0.25)',
  outlineColor: 'rgba(255,255,255,0.70)',
  outlineWidth: 2.4,
  pulseSpeed: 2.9,
  pulseScaleMin: 0.90,
  pulseScaleMax: 1.18,
  iconScale: 0.68,
  showLabelFallback: true,
  spawnIntervalInitial: 48000,
  baseSpawnInterval: 60000,
  spawnIntervalMin: 30000,
  spawnIntervalDecayScore: 400,
  randomJitter: 15000,
  backfillCatchUp: true,
  maxConcurrent: 1,
  awardScorePerNormal: 1,
  affectBombs: true,
  bombExplode: true,
  ringRadius: 320,
  screenShake: true,
  shakeIntensity: 26,
  shakeDuration: 320,
  slowMoEnabled: true,
  slowMoFactor: 0.55,
  slowMoDurationMs: 900,
  globalFlash: 'rgba(255,235,130,0.22)',
  /* NEW: also wipe hazards & powerups (no benefits granted) */
  affectPowerups: true,
  affectHazards: true,
  removedVanishColor: 'rgba(255,210,77,0.35)'
};

export const SOUNDWAVE_POWERUP = {
  enabled: true,
  label: 'SND',
  imageSrc: 'static/soundwave.png',
  size: 34,
  textColor: '#ffffff',
  glow: 'rgba(160,120,255,0.55)',
  pulseSpeed: 3.1,
  pulseScaleMin: 0.88,
  pulseScaleMax: 1.17,
  iconScale: 1,
  showLabelFallback: true,
  spawnIntervalInitial: 26000,
  baseSpawnInterval: 34000,
  spawnIntervalMin: 13000,
  spawnIntervalDecayScore: 240,
  randomJitter: 8000,
  backfillCatchUp: true,
  maxConcurrent: 1,
  pulses: 3,
  pulseIntervalMs: 260,
  firstRadius: 140,
  radiusGrowth: 160,
  awardScorePerNormal: 1,
  affectBombs: true,
  bombExplode: true,
  slowMoEnabled: true,
  slowMoFactor: 0.7,
  slowMoDurationMs: 1000,
  screenShakeEachPulse: true,
  shakeIntensity: 14,
  shakeDuration: 180,
  ringColor: 'rgba(160,120,255,0.50)'
};

export const STICKY_KEYS = {
  enabled: true,
  label: 'STK',
  imageSrc: 'static/sticky.png',
  size: 250,
  speedRange: [1200, 2000],
  spawnIntervalInitial: 8000,
  baseSpawnInterval: 9000,
  spawnIntervalMin: 3500,
  spawnIntervalDecayScore: 120,
  randomJitter: 3000,
  backfillCatchUp: true,
  maxConcurrent: 2,
  durationMs: 1000,
  pulseSpeed: 3,
  glow: 'rgba(255,255,255,0.35)',
  color: '#222222',
  outline: '#888',
  textColor: '#ffffff',
  iconScale: 0.75,
  showLabelFallback: true,
  lockLockedSrc: 'static/locked.png',
  lockUnlockedSrc: 'static/unlocked.png',
  lockDrawWidth: 64,
  lockDrawHeight: 64,
  lockBaseScale: 1.0,
  lockYOffset: 30
};

export const HIGH_SCORE_KEY = LS_KEYS.highScore;

export const SIZE_TIERS = [
  { label:'-4KB',    speedFactor:1.55, textColor:'#ffb347', glowColor:'rgba(255,179,71,0.55)' },
  { label:'-16KB',   speedFactor:1.42, textColor:'#ffd257', glowColor:'rgba(255,210,87,0.50)' },
  { label:'-64KB',   speedFactor:1.30, textColor:'#9ad42f', glowColor:'rgba(154,212,47,0.45)' },
  { label:'-256KB',  speedFactor:1.18, textColor:'#36c6ff', glowColor:'rgba(54,198,255,0.40)' },
  { label:'-1MB',    speedFactor:1.05, textColor:'#1e90ff', glowColor:'rgba(30,144,255,0.38)' },
  { label:'-16MB',   speedFactor:0.95, textColor:'#5b6cff', glowColor:'rgba(91,108,255,0.35)' },
  { label:'-128MB',  speedFactor:0.88, textColor:'#aa5bff', glowColor:'rgba(170,91,255,0.35)' },
  { label:'-1GB',    speedFactor:0.80, textColor:'#ff59c7', glowColor:'rgba(255,89,199,0.38)' },
  { label:'-5GB',    speedFactor:0.72, textColor:'#ff4d6d', glowColor:'rgba(255,77,109,0.40)' }
];

export const HAZARDS = [
  { label:"inconsistent design", class:"fast",    color:"#ffbf3c", text:"#2c1b00" },
  { label:"forced updates",      class:"fast",    color:"#ff6b2d", text:"#2c1300" },
  { label:"bsod",                class:"fast",    color:"#1e90ff", text:"#ffffff" },
  { label:"ai crap",             class:"extreme", color:"#b800ff", text:"#ffffff" },
  { label:"bad troubleshooter",  class:"fast",    color:"#ff4d6d", text:"#2c000b" },
  { label:"bad search function", class:"extreme", color:"#ff2f2f", text:"#2c0000" },
  { label:"edge browser",        class:"extreme", color:"#00c17c", text:"#003524" },
  { label:"ads",                 class:"extreme", color:"#ff9f00", text:"#241400" },
  { label:"telemetry",           class:"fast",    color:"#74c0ff", text:"#071d2a" },
  { label:"bing",                class:"fast",    color:"#00b2ff", text:"#002333" }
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
  triggerScore: 30,
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
  dropSpeedRange: [260, 900],
  damagePerCatch: 1,
  label: 'MICROSOFT',
  logoSrc: 'static/microsoft.png'
};

export const NUKE_CONFIG = {
  spinnerIncrementBase: 0.035,
  spinnerRandomAdd: 1.0,
  minStep: 0.25,
  intervalMin: 220,
  intervalRand: 260
};

export const ENABLE_INSERT_BYPASS = true;
