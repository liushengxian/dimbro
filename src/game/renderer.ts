import { BALANCE } from './data/balance';
import { CHARACTERS_BY_ID } from './data/characters';
import { ENEMIES_BY_ID } from './data/enemies';
import { WEAPONS_BY_ID } from './data/weapons';
import type {
  BattleWorld,
  CharacterPalette,
  DamageText,
  EffectEntity,
  EnemyDef,
  EnemyEntity,
  HazardEntity,
  PickupEntity,
  PlayerStats,
  ProjectileEntity,
  RunState,
  SpawnWarning,
  WeaponDef,
} from './types';

/**
 * The arena is authored at a fixed logical resolution. The canvas scales it as
 * a whole and letterboxes the remainder, so every effect stays readable at any
 * window size.
 */
const WORLD_W = 1600;
const WORLD_H = 900;
const TAU = Math.PI * 2;
const DARK = '#040908';
const INK = '#f2ead8';
const AMBER = '#f5a524';
const AMBER_BRIGHT = '#ffc866';
const DANGER = '#ff5c5c';
const DANGER_BRIGHT = '#ff9a84';
const SUNSET = '#ff6b4a';
const GOLD = '#ffd166';
const OUTLINE = '#06100d';

const SCENE_W = BALANCE.worldWidth ?? WORLD_W;
const SCENE_H = BALANCE.worldHeight ?? WORLD_H;

const FALLBACK_PALETTE: CharacterPalette = {
  primary: SUNSET,
  secondary: AMBER,
  glow: AMBER_BRIGHT,
  suit: '#1c2c27',
  visor: AMBER,
  metal: '#33443d',
};

type Palette = CharacterPalette;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  const p = 1 - clamp01(t);
  return 1 - p * p * p;
}

function easeOutQuad(t: number): number {
  const p = 1 - clamp01(t);
  return 1 - p * p;
}

function pulse(time: number, speed: number, phase = 0): number {
  return 0.5 + 0.5 * Math.sin(time * speed + phase);
}

/** Deterministic local RNG, used only for one-time background authoring. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function polygonPath(
  ctx: CanvasRenderingContext2D,
  radius: number,
  sides: number,
  rotation = 0,
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * TAU) / sides;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function gearPath(
  ctx: CanvasRenderingContext2D,
  radius: number,
  teeth: number,
  rotation: number,
  toothDepth = 0.22,
): void {
  const inner = radius * (1 - toothDepth);
  const step = TAU / (teeth * 2);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i += 1) {
    const angle = rotation + i * step;
    const r = i % 2 === 0 ? radius : inner;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  fill: string,
  elite: boolean,
): void {
  ctx.fillStyle = 'rgba(4, 9, 8, 0.86)';
  roundRect(ctx, x - width / 2 - 2, y - 2, width + 4, height + 4, 3);
  ctx.fill();
  ctx.strokeStyle = elite ? 'rgba(245, 165, 36, 0.6)' : 'rgba(242, 234, 216, 0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const w = Math.max(0, width * clamp01(ratio));
  if (w > 0) {
    ctx.fillStyle = fill;
    ctx.fillRect(x - width / 2, y, w, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x - width / 2, y, w, Math.max(1, height * 0.3));
  }
}

function weaponFor(run: RunState | null): WeaponDef | undefined {
  if (!run) return undefined;
  const first = run.weapons[0];
  if (first) {
    const found = WEAPONS_BY_ID[first.id];
    if (found) return found;
  }
  const character = CHARACTERS_BY_ID[run.characterId];
  if (!character) return undefined;
  return WEAPONS_BY_ID[character.startingWeaponId];
}

function paletteFor(run: RunState | null): Palette {
  if (!run) return FALLBACK_PALETTE;
  const character = CHARACTERS_BY_ID[run.characterId];
  return character?.palette ?? FALLBACK_PALETTE;
}

export class BattleRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private observer: ResizeObserver | null = null;
  private fallbackResize: (() => void) | null = null;
  private background: HTMLCanvasElement | null = null;
  private glowCache = new Map<string, HTMLCanvasElement>();
  private dpr = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.setCanvas(canvas);
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.destroyed = false;
    this.detachResize();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
    this.attachResize();
  }

  resize(): void {
    const canvas = this.canvas;
    if (!canvas || this.destroyed) return;

    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width || window.innerWidth || 1));
    const cssH = Math.max(1, Math.floor(rect.height || window.innerHeight || 1));
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const backingW = Math.max(1, Math.round(cssW * dpr));
    const backingH = Math.max(1, Math.round(cssH * dpr));

    if (canvas.width !== backingW) canvas.width = backingW;
    if (canvas.height !== backingH) canvas.height = backingH;

    this.dpr = dpr;
    this.scale = Math.min(cssW / SCENE_W, cssH / SCENE_H);
    this.offsetX = (cssW - SCENE_W * this.scale) / 2;
    this.offsetY = (cssH - SCENE_H * this.scale) / 2;
  }

  render(
    world: BattleWorld | null,
    run: RunState | null,
    _stats: PlayerStats | null,
    alpha: number,
  ): void {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx || this.destroyed) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!world) return;

    ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      this.dpr * this.offsetX,
      this.dpr * this.offsetY,
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SCENE_W, SCENE_H);
    ctx.clip();

    const time = world.elapsed + clamp01(alpha) / 60;
    const palette = paletteFor(run);
    const bg = this.ensureBackground();
    if (bg) ctx.drawImage(bg, 0, 0, SCENE_W, SCENE_H);

    this.drawHazards(ctx, world.hazards, time);
    this.drawSpawnWarnings(ctx, world.spawnWarnings, time);
    this.drawPickups(ctx, world.pickups, world.timeLeft, time);
    for (const enemy of world.enemies) this.drawEnemy(ctx, enemy, time);
    this.drawPlayer(ctx, world, run, palette, time);
    for (const p of world.playerProjectiles) this.drawPlayerProjectile(ctx, p, time);
    for (const p of world.enemyProjectiles) this.drawEnemyProjectile(ctx, p, time);
    for (const effect of world.effects) this.drawEffect(ctx, effect, time);
    for (const text of world.damageTexts) this.drawDamageText(ctx, text);
    this.drawBossWarnings(ctx, world, time);

    ctx.restore();
  }

  destroy(): void {
    this.destroyed = true;
    this.detachResize();
    this.canvas = null;
    this.ctx = null;
    this.background = null;
    this.glowCache.clear();
  }

  private attachResize(): void {
    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.canvas);
      return;
    }
    const handler = () => this.resize();
    this.fallbackResize = handler;
    window.addEventListener('resize', handler);
  }

  private detachResize(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.fallbackResize) {
      window.removeEventListener('resize', this.fallbackResize);
      this.fallbackResize = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Static factory backdrop
  // ---------------------------------------------------------------------------

  private ensureBackground(): HTMLCanvasElement | null {
    if (this.background) return this.background;
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(SCENE_W);
    canvas.height = Math.round(SCENE_H);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.background = canvas;
      return canvas;
    }

    const rng = seeded(0xd1b6a9);
    const base = ctx.createLinearGradient(0, 0, SCENE_W * 0.35, SCENE_H);
    base.addColorStop(0, '#0a1713');
    base.addColorStop(0.46, '#07110f');
    base.addColorStop(1, '#030706');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    ctx.save();
    ctx.strokeStyle = 'rgba(103, 232, 199, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 100; x < SCENE_W; x += 200) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, SCENE_H - 24);
      ctx.stroke();
    }
    for (let y = 100; y < SCENE_H; y += 200) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(SCENE_W - 24, y);
      ctx.stroke();
    }
    const fine = ctx.createPattern(makeGridTile(), 'repeat');
    if (fine) {
      ctx.fillStyle = fine;
      ctx.fillRect(0, 0, SCENE_W, SCENE_H);
    }
    ctx.restore();

    this.drawPipes(ctx, rng);

    // Oil stains: soft patches with a faint iridescent service-floor rim.
    for (let i = 0; i < 11; i += 1) {
      const x = 120 + rng() * (SCENE_W - 240);
      const y = 110 + rng() * (SCENE_H - 220);
      const rx = 26 + rng() * 96;
      const ry = rx * (0.35 + rng() * 0.35);
      const rotation = rng() * TAU;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      const stain = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
      stain.addColorStop(0, 'rgba(2, 6, 5, 0.48)');
      stain.addColorStop(0.6, 'rgba(4, 12, 10, 0.3)');
      stain.addColorStop(0.86, 'rgba(38, 70, 58, 0.08)');
      stain.addColorStop(1, 'rgba(4, 10, 8, 0)');
      ctx.fillStyle = stain;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(103, 232, 199, 0.05)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.8, ry * 0.8, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // Calibration rings and dashed service lanes.
    ctx.save();
    for (let i = 0; i < 7; i += 1) {
      const x = 150 + rng() * (SCENE_W - 300);
      const y = 130 + rng() * (SCENE_H - 260);
      const radius = 20 + rng() * 70;
      ctx.strokeStyle = `rgba(147, 166, 158, ${0.035 + rng() * 0.035})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - radius - 8, y);
      ctx.lineTo(x - radius + 4, y);
      ctx.moveTo(x + radius - 4, y);
      ctx.lineTo(x + radius + 8, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.055)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 18]);
    ctx.beginPath();
    ctx.moveTo(70, SCENE_H * 0.5);
    ctx.lineTo(SCENE_W - 70, SCENE_H * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    this.drawWarningBand(ctx, 0, 18, SCENE_W, 20, 0.5);
    this.drawWarningBand(ctx, 0, SCENE_H - 38, SCENE_W, 20, -0.5);

    this.drawGearSilhouette(ctx, 10, 8, 150, 18, 'rgba(17, 38, 31, 0.82)');
    this.drawGearSilhouette(ctx, SCENE_W - 8, SCENE_H - 4, 178, 20, 'rgba(12, 29, 24, 0.86)');
    this.drawGearSilhouette(ctx, SCENE_W + 6, -22, 108, 14, 'rgba(15, 33, 27, 0.72)');
    this.drawGearSilhouette(ctx, -26, SCENE_H + 16, 118, 14, 'rgba(11, 26, 21, 0.76)');

    this.paintRadial(ctx, 280, 150, 340, 'rgba(245, 165, 36, 0.055)');
    this.paintRadial(ctx, SCENE_W - 260, 190, 300, 'rgba(103, 232, 199, 0.035)');
    this.paintRadial(ctx, SCENE_W - 330, SCENE_H - 130, 380, 'rgba(245, 165, 36, 0.045)');
    this.paintRadial(ctx, 330, SCENE_H - 190, 290, 'rgba(255, 92, 92, 0.022)');

    ctx.strokeStyle = 'rgba(242, 234, 216, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, SCENE_W - 24, SCENE_H - 24);
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, SCENE_W - 48, SCENE_H - 48);
    this.drawCornerBrackets(ctx);

    const vignette = ctx.createRadialGradient(
      SCENE_W / 2,
      SCENE_H / 2,
      SCENE_H * 0.28,
      SCENE_W / 2,
      SCENE_H / 2,
      SCENE_W * 0.68,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.68, 'rgba(0, 0, 0, 0.22)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.66)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    this.background = canvas;
    return canvas;
  }

  private drawPipes(ctx: CanvasRenderingContext2D, rng: () => number): void {
    ctx.save();
    const runs = [
      { x: 0, y: 56, w: SCENE_W, h: 7 },
      { x: 0, y: 78, w: SCENE_W, h: 3 },
      { x: 0, y: SCENE_H - 62, w: SCENE_W, h: 6 },
      { x: 62, y: 0, w: 5, h: SCENE_H },
      { x: SCENE_W - 70, y: 0, w: 5, h: SCENE_H },
    ];
    for (const run of runs) {
      ctx.fillStyle = 'rgba(19, 39, 33, 0.7)';
      ctx.fillRect(run.x, run.y, run.w, run.h);
      ctx.fillStyle = 'rgba(103, 232, 199, 0.08)';
      ctx.fillRect(run.x, run.y, run.w, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.fillRect(run.x, run.y + run.h - 1, run.w, 1);

      const horizontal = run.w >= run.h;
      const length = horizontal ? run.w : run.h;
      const step = 130 + rng() * 80;
      for (let p = 30; p < length; p += step) {
        ctx.fillStyle = 'rgba(30, 54, 46, 0.82)';
        if (horizontal) ctx.fillRect(p, run.y - 3, 10, run.h + 6);
        else ctx.fillRect(run.x - 3, p, run.w + 6, 10);
        ctx.fillStyle = 'rgba(245, 165, 36, 0.13)';
        if (horizontal) ctx.fillRect(p + 2, run.y - 1, 2, run.h + 2);
        else ctx.fillRect(run.x - 1, p + 2, run.w + 2, 2);
      }
    }

    for (let i = 0; i < 2; i += 1) {
      const x = i === 0 ? 128 : SCENE_W - 128;
      const y = i === 0 ? 54 : SCENE_H - 60;
      ctx.fillStyle = 'rgba(8, 20, 16, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 165, 36, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(245, 165, 36, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 9, y - 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWarningBand(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    skew: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(8, 15, 12, 0.9)';
    ctx.fillRect(x, y, w, h);
    const step = 34;
    const offset = skew > 0 ? 0 : 20;
    for (let px = -h + offset; px < w + h; px += step) {
      ctx.beginPath();
      ctx.moveTo(px, y + h);
      ctx.lineTo(px + h, y);
      ctx.lineTo(px + h + 15, y);
      ctx.lineTo(px + 15, y + h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245, 165, 36, 0.16)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private drawGearSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    teeth: number,
    color: string,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    gearPath(ctx, radius, teeth, 0.16, 0.18);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(103, 232, 199, 0.055)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.46, 0, TAU);
    ctx.fillStyle = 'rgba(3, 9, 7, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.055)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private paintRadial(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
  ): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  private drawCornerBrackets(ctx: CanvasRenderingContext2D): void {
    const inset = 32;
    const len = 42;
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.26)';
    ctx.lineWidth = 2;
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 1, 1],
      [SCENE_W - inset, inset, -1, 1],
      [inset, SCENE_H - inset, 1, -1],
      [SCENE_W - inset, SCENE_H - inset, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Glow sprite cache
  // ---------------------------------------------------------------------------

  private glow(color: string): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const cached = this.glowCache.get(color);
    if (cached) return cached;

    const sprite = document.createElement('canvas');
    sprite.width = 64;
    sprite.height = 64;
    const ctx = sprite.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, color);
      grad.addColorStop(0.28, color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    this.glowCache.set(color, sprite);
    return sprite;
  }

  private drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number,
  ): void {
    if (radius <= 0 || alpha <= 0) return;
    const sprite = this.glow(color);
    if (!sprite) return;
    const previousOp = ctx.globalCompositeOperation;
    const previousAlpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = previousAlpha * clamp01(alpha);
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = previousAlpha;
    ctx.globalCompositeOperation = previousOp;
  }

  // ---------------------------------------------------------------------------
  // Hazards and spawn warnings
  // ---------------------------------------------------------------------------

  private drawHazards(
    ctx: CanvasRenderingContext2D,
    hazards: HazardEntity[],
    time: number,
  ): void {
    for (const hazard of hazards) {
      const fade = clamp01(hazard.life / 1.2);
      const radius = Math.max(4, hazard.radius);
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.globalAlpha = 0.22 + fade * 0.55;

      const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      pool.addColorStop(0, 'rgba(255, 92, 92, 0.24)');
      pool.addColorStop(0.55, 'rgba(245, 120, 36, 0.2)');
      pool.addColorStop(0.86, 'rgba(155, 60, 12, 0.16)');
      pool.addColorStop(1, 'rgba(60, 20, 6, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 92, 92, 0.58)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -time * 22 + hazard.id * 5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.86, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255, 184, 92, 0.7)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 7; i += 1) {
        const angle = (i * TAU) / 7 + Math.sin(hazard.id + i) * 0.22;
        const reach = radius * (0.48 + 0.3 * pulse(time, 2.2, i * 1.7));
        ctx.beginPath();
        let px = Math.cos(angle) * radius * 0.1;
        let py = Math.sin(angle) * radius * 0.1;
        ctx.moveTo(px, py);
        for (let step = 1; step <= 3; step += 1) {
          const seg = (reach - radius * 0.1) / 3;
          const wobble = Math.sin(time * 4 + i * 3 + step) * 3.5;
          px += Math.cos(angle) * seg - Math.sin(angle) * wobble;
          py += Math.sin(angle) * seg + Math.cos(angle) * wobble;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 200, 102, 0.8)';
      for (let i = 0; i < 4; i += 1) {
        const a = time * 1.4 + i * 2.1 + hazard.id;
        const d = radius * (0.25 + 0.45 * pulse(time, 1.1, i * 2.4));
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawSpawnWarnings(
    ctx: CanvasRenderingContext2D,
    warnings: SpawnWarning[],
    time: number,
  ): void {
    for (const warning of warnings) {
      const progress = clamp01(1 - warning.timer / Math.max(0.001, warning.maxTimer));
      const radius = Math.max(8, warning.radius);
      const shrinking = lerp(radius * 1.55, radius * 0.72, easeOutCubic(progress));
      const color = ENEMIES_BY_ID[warning.defId]?.accent ?? DANGER;
      this.drawGlow(ctx, warning.x, warning.y, radius * 1.7, color, 0.18 + progress * 0.12);

      ctx.save();
      ctx.translate(warning.x, warning.y);
      ctx.globalAlpha = 0.45 + progress * 0.5;
      ctx.fillStyle = `rgba(255, 92, 92, ${0.05 + progress * 0.1})`;
      ctx.beginPath();
      ctx.arc(0, 0, shrinking, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 7]);
      ctx.lineDashOffset = -time * 28;
      ctx.beginPath();
      ctx.arc(0, 0, shrinking, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(242, 234, 216, 0.62)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.42, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = DANGER_BRIGHT;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const a = (i * TAU) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (shrinking - 6), Math.sin(a) * (shrinking - 6));
        ctx.lineTo(Math.cos(a) * (shrinking + 7), Math.sin(a) * (shrinking + 7));
        ctx.stroke();
      }
      ctx.fillStyle = DANGER_BRIGHT;
      for (let i = 0; i < 3; i += 1) {
        const a = time * 2.4 + (i * TAU) / 3;
        ctx.fillRect(Math.cos(a) * radius * 0.3 - 1.5, Math.sin(a) * radius * 0.3 - 1.5, 3, 3);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------

  private drawPickups(
    ctx: CanvasRenderingContext2D,
    pickups: PickupEntity[],
    timeLeft: number,
    time: number,
  ): void {
    const expiring = timeLeft <= 5;
    for (const coin of pickups) {
      let alpha = 1;
      if (expiring) {
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(time * 8 + coin.id * 1.3));
        alpha = timeLeft <= 1.5 ? blink * 0.7 : blink;
      }
      const size = 5 + Math.min(4, coin.value * 0.55);
      const bob = Math.sin(time * 4.5 + coin.id) * 1.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (coin.magnet) {
        const speed = Math.hypot(coin.vx, coin.vy);
        if (speed > 6) {
          ctx.strokeStyle = 'rgba(255, 200, 102, 0.34)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(coin.x, coin.y + bob);
          ctx.lineTo(
            coin.x - (coin.vx / speed) * 18,
            coin.y + bob - (coin.vy / speed) * 18,
          );
          ctx.stroke();
        }
      }
      this.drawGlow(ctx, coin.x, coin.y + bob, size * 2.7, AMBER, 0.2 * alpha);
      ctx.translate(coin.x, coin.y + bob);
      ctx.rotate(time * 1.4 + coin.id * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.8, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.8, 0);
      ctx.closePath();
      ctx.fillStyle = AMBER;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38, 0, TAU);
      ctx.fillStyle = AMBER_BRIGHT;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 232, 160, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 1.1, 0);
      ctx.lineTo(-size * 0.75, 0);
      ctx.moveTo(size * 0.75, 0);
      ctx.lineTo(size * 1.1, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies
  // ---------------------------------------------------------------------------

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    time: number,
  ): void {
    if (enemy.dead) return;
    const def: EnemyDef | undefined = ENEMIES_BY_ID[enemy.defId];
    const baseColor = def?.color ?? '#4b5f57';
    const accent = def?.accent ?? DANGER;
    const radius = Math.max(5, enemy.radius);
    const flash = enemy.hitFlash > 0;
    const bossPhase = enemy.boss && enemy.phase === 2;
    const phaseColor = bossPhase ? SUNSET : baseColor;
    const bodyColor = flash ? INK : phaseColor;
    const lineColor = flash ? '#ffffff' : bossPhase ? DANGER_BRIGHT : accent;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.5, radius * 0.95, radius * 0.4, 0, 0, TAU);
    ctx.fill();

    if (enemy.burnTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6 + pulse(time, 14) * 0.3;
      ctx.strokeStyle = '#ffb85c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const a = time * 5 + (i * TAU) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.85);
        ctx.quadraticCurveTo(
          Math.cos(a + 0.3) * radius * 1.15,
          Math.sin(a + 0.3) * radius * 1.15,
          Math.cos(a) * radius * 1.35,
          Math.sin(a) * radius * 1.35,
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    if (enemy.boss) {
      this.drawBossBody(ctx, enemy, radius, bodyColor, lineColor, time);
    } else {
      switch (enemy.defId) {
        case 'biter':
          this.drawBiter(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
        case 'drone':
          this.drawDrone(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
        case 'charger':
          this.drawCharger(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
        case 'spitter':
          this.drawSpitter(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
        case 'overseer':
          this.drawOverseer(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
        case 'forgeCore':
          this.drawBossBody(ctx, enemy, radius, bodyColor, lineColor, time);
          break;
      }
    }

    if (enemy.elite) {
      ctx.save();
      ctx.rotate(time * 0.7 + enemy.id);
      ctx.strokeStyle = flash ? '#ffffff' : AMBER;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 11, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = flash ? '#ffffff' : 'rgba(245, 165, 36, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 17, -0.45, 1.05);
      ctx.arc(0, 0, radius + 17, Math.PI - 0.45, Math.PI + 1.05);
      ctx.stroke();
      ctx.restore();

      drawHealthBar(
        ctx,
        0,
        -radius - 22,
        62,
        4,
        enemy.hp / Math.max(1, enemy.maxHp),
        DANGER,
        true,
      );
    }

    if (enemy.boss) {
      ctx.save();
      if (enemy.softEnrage) {
        const ringRadius = radius + 24 + pulse(time, 5) * 8;
        ctx.strokeStyle = 'rgba(255, 92, 92, 0.65)';
        ctx.lineWidth = 3;
        ctx.setLineDash([18, 10]);
        ctx.lineDashOffset = -time * 40;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255, 154, 132, 0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i += 1) {
          const a = -time * 1.1 + (i * TAU) / 8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (ringRadius - 4), Math.sin(a) * (ringRadius - 4));
          ctx.lineTo(Math.cos(a) * (ringRadius + 8), Math.sin(a) * (ringRadius + 8));
          ctx.stroke();
        }
      }
      if (enemy.invuln > 0) {
        ctx.strokeStyle = 'rgba(242, 234, 216, 0.45)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i += 1) {
          const a = time * 0.8 + (i * TAU) / 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (radius + 6), Math.sin(a) * (radius + 6));
          ctx.lineTo(
            Math.cos(a + 0.55) * (radius + 6),
            Math.sin(a + 0.55) * (radius + 6),
          );
          ctx.stroke();
        }
      }
      ctx.restore();
      drawHealthBar(
        ctx,
        0,
        -radius - 30,
        118,
        6,
        enemy.hp / Math.max(1, enemy.maxHp),
        bossPhase ? DANGER : AMBER,
        true,
      );
    }
    ctx.restore();
  }

  private drawBiter(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(enemy.angle);
    ctx.beginPath();
    ctx.moveTo(radius * 1.1, 0);
    ctx.lineTo(-radius * 0.72, radius * 0.82);
    ctx.lineTo(-radius * 0.38, 0);
    ctx.lineTo(-radius * 0.72, -radius * 0.82);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(4, 9, 8, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(radius * 0.12, 0);
    ctx.lineTo(-radius * 0.38, 0);
    ctx.stroke();
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.arc(radius * 0.26, 0, 2.2 + pulse(time, 8) * 0.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawDrone(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(time * 1.8 + enemy.id);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.86, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.86, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242, 234, 216, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.35, 0);
    ctx.lineTo(radius * 0.35, 0);
    ctx.moveTo(0, -radius * 0.35);
    ctx.lineTo(0, radius * 0.35);
    ctx.stroke();
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawCharger(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    const telegraph = enemy.mode === 'telegraph';
    ctx.save();
    ctx.rotate(enemy.angle);
    roundRect(ctx, -radius * 0.9, -radius * 0.82, radius * 1.8, radius * 1.64, 3);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = telegraph ? DANGER_BRIGHT : line;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = telegraph ? DANGER : 'rgba(4, 9, 8, 0.48)';
    ctx.fillRect(radius * 0.36, -radius * 0.55, radius * 0.45, radius * 1.1);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.58, i * radius * 0.25);
      ctx.lineTo(-radius * 0.28, i * radius * 0.25);
      ctx.stroke();
    }
    if (telegraph) {
      ctx.strokeStyle = 'rgba(255, 92, 92, 0.52)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath();
      ctx.moveTo(radius * 0.9, 0);
      ctx.lineTo(radius * 4.6, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  private drawSpitter(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(enemy.angle);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(4, 9, 8, 0.68)';
    for (let i = 0; i < 3; i += 1) {
      const a = -0.32 + i * 0.32;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62, radius * 0.13, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 0.55 + pulse(time, 3.4) * 0.45;
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.arc(-radius * 0.18, 0, radius * 0.27, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawOverseer(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(-time * 1.1 + enemy.id);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 7, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(time * 2.3);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0.2, 2.5);
    ctx.arc(0, 0, radius * 0.6, Math.PI + 0.2, Math.PI + 2.5);
    ctx.stroke();
    ctx.fillStyle = DANGER_BRIGHT;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawBossBody(
    ctx: CanvasRenderingContext2D,
    enemy: EnemyEntity,
    radius: number,
    fill: string,
    line: string,
    time: number,
  ): void {
    const phase2 = enemy.phase === 2;
    ctx.save();
    ctx.rotate(time * 0.18);
    gearPath(ctx, radius, 12, 0, 0.16);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.rotate(-time * 0.72);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, TAU);
    ctx.fillStyle = 'rgba(4, 9, 8, 0.74)';
    ctx.fill();
    ctx.strokeStyle = phase2 ? DANGER : 'rgba(245, 165, 36, 0.86)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.rotate(time * 0.9);
    polygonPath(ctx, radius * 0.46, 3, time * 0.8);
    ctx.fillStyle = phase2 ? DANGER : AMBER;
    ctx.globalAlpha = 0.72 + pulse(time, 3) * 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.17, 0, TAU);
    ctx.fillStyle = phase2 ? '#ffd1c4' : AMBER_BRIGHT;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = phase2 ? 'rgba(255, 92, 92, 0.6)' : 'rgba(245, 165, 36, 0.42)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const a = Math.PI / 4 + (i * TAU) / 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 10, a - 0.16, a + 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    world: BattleWorld,
    run: RunState | null,
    palette: Palette,
    time: number,
  ): void {
    const player = world.player;
    const facingAngle =
      Math.abs(player.facingX) + Math.abs(player.facingY) < 0.001
        ? -Math.PI / 2
        : Math.atan2(player.facingY, player.facingX);
    const radius = Math.max(8, player.radius);
    const shake = player.hitFlash > 0 ? Math.sin(time * 90) * 1.2 : 0;

    if (world.passive.lightTrailActive) {
      for (const ghost of player.trail) {
        const age = Math.max(0, ghost.age);
        const fade = clamp01(1 - age / 0.32);
        if (fade <= 0) continue;
        ctx.save();
        ctx.translate(ghost.x, ghost.y);
        ctx.rotate(facingAngle);
        ctx.globalAlpha = fade * 0.3;
        ctx.fillStyle = palette.glow;
        roundRect(ctx, -radius * 0.7, -radius * 0.62, radius * 1.5, radius * 1.24, 6);
        ctx.fill();
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalAlpha = 0.34 + pulse(time, 6) * 0.18;
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 1;
      const box = radius + 17;
      const tick = 6;
      ctx.beginPath();
      ctx.moveTo(-box, -box + tick);
      ctx.lineTo(-box, -box);
      ctx.lineTo(-box + tick, -box);
      ctx.moveTo(box - tick, -box);
      ctx.lineTo(box, -box);
      ctx.lineTo(box, -box + tick);
      ctx.moveTo(box, box - tick);
      ctx.lineTo(box, box);
      ctx.lineTo(box - tick, box);
      ctx.moveTo(-box + tick, box);
      ctx.lineTo(-box, box);
      ctx.lineTo(-box, box - tick);
      ctx.stroke();
      ctx.restore();
    }

    if (world.passive.resetActive) {
      this.drawResetAura(ctx, player.x, player.y, radius, time);
    }

    ctx.save();
    ctx.translate(player.x + shake, player.y);
    ctx.rotate(facingAngle);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.7, radius * 0.98, radius * 0.42, 0, 0, TAU);
    ctx.fill();

    const bob = Math.sin(time * 9) * 0.65;
    const weapon = weaponFor(run);
    const weaponColor = weapon?.color ?? palette.primary;
    const charId = run?.characterId ?? 'sunsetNeedle';

    ctx.fillStyle = palette.metal;
    roundRect(ctx, -radius * 0.94, -radius * 0.7, radius * 0.62, radius * 1.4, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (charId === 'simon') {
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.82, -radius * 0.62);
      ctx.quadraticCurveTo(
        -radius * 1.35,
        -radius * 0.15,
        -radius * 0.86,
        radius * 0.52,
      );
      ctx.stroke();
      ctx.fillStyle = palette.glow;
      ctx.fillRect(-radius * 1.25, -radius * 0.08, 4, 4);
    } else {
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.55, -radius * 0.44);
      ctx.lineTo(-radius * 1.2, -radius * 0.94);
      ctx.stroke();
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(-radius * 1.22, -radius * 0.96, 2.4, 0, TAU);
      ctx.fill();
    }

    const stride = Math.sin(time * 12) * radius * 0.16;
    ctx.fillStyle = palette.suit;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    roundRect(ctx, -radius * 0.58, -radius * 0.58 + stride, radius * 0.72, radius * 0.4, 4);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -radius * 0.58, radius * 0.18 - stride, radius * 0.72, radius * 0.4, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.suit;
    roundRect(
      ctx,
      -radius * 0.58,
      -radius * 0.52 + bob,
      radius * 1.12,
      radius * 1.04,
      6,
    );
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = palette.primary;
    roundRect(
      ctx,
      -radius * 0.12,
      -radius * 0.26 + bob,
      radius * 0.46,
      radius * 0.52,
      2,
    );
    ctx.fill();
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.metal;
    roundRect(ctx, radius * 0.02, -radius * 0.96 + bob, radius * 0.48, radius * 0.34, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    roundRect(ctx, radius * 0.02, radius * 0.6 + bob, radius * 0.5, radius * 0.34, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.suit;
    ctx.beginPath();
    ctx.arc(radius * 0.32, bob, radius * 0.54, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = palette.metal;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = palette.visor;
    roundRect(
      ctx,
      radius * 0.48,
      -radius * 0.38 + bob,
      radius * 0.3,
      radius * 0.76,
      3,
    );
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(radius * 0.63, -radius * 0.27 + bob, 1.6, radius * 0.5);

    this.drawPlayerWeapon(ctx, weapon, weaponColor, radius, bob, time);

    if (player.hitFlash > 0) {
      ctx.globalAlpha = clamp01(player.hitFlash * 9) * 0.8;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -radius * 0.64, -radius * 0.58, radius * 1.26, radius * 1.16, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(radius * 0.32, 0, radius * 0.54, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (run && run.shields > 0) {
      const layers = Math.min(2, Math.max(0, Math.floor(run.shields)));
      for (let i = 0; i < layers; i += 1) {
        const ringRadius = radius + 13 + i * 7;
        const spin = time * (1.4 + i * 0.25) * (i === 0 ? 1 : -1);
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(spin);
        ctx.strokeStyle = i === 0 ? GOLD : AMBER;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.78;
        ctx.setLineDash([15, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let k = 0; k < 3; k += 1) {
          const a = (k * TAU) / 3;
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(
            Math.cos(a) * ringRadius,
            Math.sin(a) * ringRadius,
            2.7,
            0,
            TAU,
          );
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  private drawPlayerWeapon(
    ctx: CanvasRenderingContext2D,
    weapon: WeaponDef | undefined,
    color: string,
    radius: number,
    bob: number,
    time: number,
  ): void {
    const behavior = weapon?.behavior ?? 'projectile';
    ctx.save();
    ctx.translate(radius * 0.25, radius * 0.55 + bob);
    switch (behavior) {
      case 'shotgun':
        ctx.fillStyle = color;
        roundRect(ctx, radius * 0.15, -radius * 0.19, radius * 0.8, radius * 0.38, 2);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(4, 9, 8, 0.7)';
        ctx.fillRect(radius * 0.7, -radius * 0.27, radius * 0.16, radius * 0.54);
        break;
      case 'melee':
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(radius * 0.1, 0);
        ctx.lineTo(radius * 0.72, 0);
        ctx.stroke();
        ctx.fillStyle = color;
        roundRect(ctx, radius * 0.64, -radius * 0.32, radius * 0.3, radius * 0.64, 3);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case 'boomerang':
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.save();
        ctx.rotate(time * 3);
        gearPath(ctx, radius * 0.36, 8, 0, 0.28);
        ctx.stroke();
        ctx.restore();
        break;
      case 'rail':
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(radius * 0.05, 0);
        ctx.lineTo(radius * 1.24, 0);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(radius * 0.75, -2, radius * 0.24, 4);
        break;
      default:
        ctx.fillStyle = color;
        roundRect(ctx, radius * 0.08, -radius * 0.2, radius * 0.82, radius * 0.4, 2);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(4, 9, 8, 0.64)';
        ctx.fillRect(radius * 0.55, -radius * 0.12, radius * 0.3, radius * 0.24);
        break;
    }
    ctx.restore();
  }

  private drawResetAura(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    time: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    this.drawGlow(ctx, 0, 0, radius * 2.4, SUNSET, 0.24);
    ctx.rotate(time * 2.4);
    ctx.strokeStyle = 'rgba(255, 107, 74, 0.78)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time * 4.1);
    ctx.strokeStyle = 'rgba(255, 200, 102, 0.58)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i += 1) {
      const a = (i * TAU) / 12;
      const inner = radius + 5;
      const outer = radius + (i % 3 === 0 ? 20 : 13);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }

    ctx.rotate(-time * 1.6);
    ctx.strokeStyle = 'rgba(255, 107, 74, 0.36)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i += 1) {
      const offset = Math.sin(time * 6 + i * 1.8) * 4;
      ctx.beginPath();
      ctx.moveTo(-radius - 8, i * 7 + offset);
      ctx.lineTo(radius + 8, i * 7 + offset);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------

  private drawPlayerProjectile(
    ctx: CanvasRenderingContext2D,
    projectile: ProjectileEntity,
    time: number,
  ): void {
    const speed = Math.hypot(projectile.vx, projectile.vy);
    const angle = speed > 0.01 ? Math.atan2(projectile.vy, projectile.vx) : 0;
    const color = projectile.color || AMBER;
    const radius = Math.max(2, projectile.radius);
    const boost = projectile.crit ? 1.55 : 1;

    if (projectile.weaponId === 'returnGear') {
      const alpha = projectile.returning ? 0.62 : 1;
      this.drawGlow(ctx, projectile.x, projectile.y, radius * 3.2, color, 0.2 * alpha);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(time * 10 + projectile.id);
      ctx.globalAlpha = alpha;
      gearPath(ctx, radius * 1.45, 9, 0, 0.28);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(4, 9, 8, 0.62)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (projectile.weaponId === 'railSpike') {
      const streak = 42 + Math.min(28, speed * 0.02);
      const tailX = projectile.x - Math.cos(angle) * streak;
      const tailY = projectile.y - Math.sin(angle) * streak;
      this.drawGlow(ctx, projectile.x, projectile.y, radius * 4, color, 0.22);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.46;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      ctx.strokeStyle = projectile.crit ? '#fff2b0' : INK;
      ctx.lineWidth = projectile.crit ? 3.5 : 2.4;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(
        projectile.x - Math.cos(angle) * radius * 6,
        projectile.y - Math.sin(angle) * radius * 6,
      );
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (projectile.weaponId === 'arcHammer') {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.86;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.2 + i * 5, -0.55, 0.55);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fff2d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.7, -0.42, 0.42);
      ctx.stroke();
      ctx.restore();
      return;
    }

    this.drawGlow(ctx, projectile.x, projectile.y, radius * 3.6, color, 0.32);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.fillStyle = projectile.crit ? '#fff5c2' : color;
    roundRect(
      ctx,
      -radius * 1.8 * boost,
      -radius * 0.72 * boost,
      radius * 3.6 * boost,
      radius * 1.44 * boost,
      radius,
    );
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillRect(
      radius * 0.2 * boost,
      -radius * 0.35,
      radius * 1.1 * boost,
      radius * 0.7,
    );
    if (projectile.crit) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-radius * 3.2, 0);
      ctx.lineTo(radius * 3.2, 0);
      ctx.moveTo(0, -radius * 2.2);
      ctx.lineTo(0, radius * 2.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemyProjectile(
    ctx: CanvasRenderingContext2D,
    projectile: ProjectileEntity,
    time: number,
  ): void {
    const speed = Math.hypot(projectile.vx, projectile.vy);
    const angle = speed > 0.01 ? Math.atan2(projectile.vy, projectile.vx) : 0;
    const color = projectile.color || DANGER;
    const radius = Math.max(2, projectile.radius);
    this.drawGlow(ctx, projectile.x, projectile.y, radius * 4.2, color, 0.25);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(255, 107, 74, 0.55)';
    ctx.lineWidth = radius * 1.2;
    ctx.beginPath();
    ctx.moveTo(-radius * 4.5, 0);
    ctx.lineTo(-radius, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe0c2';
    ctx.beginPath();
    ctx.arc(radius * 0.22, 0, radius * 0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 196, 150, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2 + pulse(time, 7, projectile.id) * 1.4, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Effects and damage numbers
  // ---------------------------------------------------------------------------

  private drawEffect(
    ctx: CanvasRenderingContext2D,
    effect: EffectEntity,
    time: number,
  ): void {
    const duration = Math.max(0.001, effect.maxLife);
    const progress = clamp01(1 - effect.life / duration);
    const fade = 1 - progress;
    const radius = Math.max(4, effect.radius);
    const color = effect.color || AMBER;

    ctx.save();
    ctx.globalAlpha = fade;
    switch (effect.kind) {
      case 'muzzle': {
        const reach = radius * (0.4 + easeOutQuad(progress) * 1.1);
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.34);
        ctx.lineTo(reach, 0);
        ctx.lineTo(0, radius * 0.34);
        ctx.lineTo(radius * 0.18, 0);
        ctx.closePath();
        ctx.fill();
        this.drawGlow(ctx, 0, 0, radius * 1.7, color, fade * 0.4);
        break;
      }
      case 'hit': {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i += 1) {
          const a = (i * TAU) / 6;
          const inner = radius * (0.25 + progress * 0.5);
          const outer = inner + radius * (0.45 + progress * 0.42);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
          ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff5d0';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.2 * fade, 0, TAU);
        ctx.fill();
        break;
      }
      case 'kill': {
        ctx.translate(effect.x, effect.y);
        for (let i = 0; i < 8; i += 1) {
          const a = (i * TAU) / 8 + effect.angle;
          const distance = radius * (0.35 + progress * 1.3);
          const size = radius * 0.16 * fade;
          ctx.save();
          ctx.translate(Math.cos(a) * distance, Math.sin(a) * distance);
          ctx.rotate(a + progress * 3);
          ctx.fillStyle = i % 2 === 0 ? color : AMBER_BRIGHT;
          ctx.fillRect(-size, -size, size * 2, size * 2);
          ctx.restore();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.2 + progress * 1.4), 0, TAU);
        ctx.stroke();
        break;
      }
      case 'reset': {
        ctx.translate(effect.x, effect.y);
        ctx.strokeStyle = SUNSET;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i += 1) {
          const y = -radius + progress * radius * 2 + i * radius * 0.34;
          const offset = Math.sin(time * 30 + i * 4) * radius * 0.3;
          ctx.beginPath();
          ctx.moveTo(-radius - offset, y);
          ctx.lineTo(radius + offset, y);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 107, 74, 0.2)';
        ctx.fillRect(
          -radius + Math.sin(time * 20) * radius * 0.3,
          -radius * 1.4,
          radius * 0.5,
          radius * 2.8,
        );
        ctx.strokeStyle = AMBER_BRIGHT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.6 + progress), 0, TAU);
        ctx.stroke();
        break;
      }
      case 'shield': {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(time * 2.8 + progress * 2);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            radius * (0.65 + progress * 0.42),
            (i * TAU) / 3,
            (i * TAU) / 3 + 0.9,
          );
          ctx.stroke();
        }
        for (let i = 0; i < 5; i += 1) {
          const a = (i * TAU) / 5;
          const d = radius * (0.5 + progress * 0.65);
          ctx.fillStyle = AMBER_BRIGHT;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.3, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'shieldBreak': {
        ctx.translate(effect.x, effect.y);
        for (let i = 0; i < 10; i += 1) {
          const a = (i * TAU) / 10 + effect.angle;
          const d = radius * (0.35 + progress * 1.2);
          ctx.save();
          ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
          ctx.rotate(a);
          ctx.fillStyle = i % 3 === 0 ? GOLD : color;
          ctx.beginPath();
          ctx.moveTo(-3, -3);
          ctx.lineTo(5, 0);
          ctx.lineTo(-3, 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.3 + progress * 1.35), 0, TAU);
        ctx.stroke();
        break;
      }
      case 'bounce': {
        const endX = effect.x + Math.cos(effect.angle) * radius;
        const endY = effect.y + Math.sin(effect.angle) * radius;
        const midX = (effect.x + endX) / 2 - Math.sin(effect.angle) * radius * 0.24;
        const midY = (effect.y + endY) / 2 + Math.cos(effect.angle) * radius * 0.24;
        ctx.strokeStyle = AMBER_BRIGHT;
        ctx.lineWidth = 2;
        ctx.globalAlpha = fade * 0.9;
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.stroke();
        ctx.translate(endX, endY);
        ctx.rotate(time * 4);
        ctx.fillStyle = GOLD;
        for (let i = 0; i < 4; i += 1) {
          const a = (i * TAU) / 4 + Math.PI / 4;
          ctx.fillRect(Math.cos(a) * 5 - 1.5, Math.sin(a) * 5 - 1.5, 3, 3);
        }
        break;
      }
      case 'arc': {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        // A hammer impact reads as a broad fan plus one bright arc of current.
        ctx.strokeStyle = color;
        ctx.globalAlpha = fade * 0.75;
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.55 + i * 0.2) + progress * radius * 0.35, -0.62, 0.62);
          ctx.stroke();
        }
        ctx.globalAlpha = fade;
        ctx.strokeStyle = '#bffcff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const segments = 7;
        for (let i = 0; i <= segments; i += 1) {
          const px = (i / segments) * radius;
          const py = i === 0 || i === segments ? 0 : Math.sin(i * 4.7 + time * 40) * radius * 0.2;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case 'burn': {
        ctx.translate(effect.x, effect.y);
        for (let i = 0; i < 5; i += 1) {
          const a = (i * TAU) / 5 + effect.angle;
          const lift = radius * (0.35 + progress * 0.9);
          ctx.strokeStyle = i % 2 === 0 ? '#ffb85c' : color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
          ctx.quadraticCurveTo(
            Math.cos(a + 0.2) * lift,
            Math.sin(a + 0.2) * lift - radius * 0.3,
            Math.cos(a) * lift,
            Math.sin(a) * lift,
          );
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 92, 92, 0.16)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.6 + progress * 0.5), 0, TAU);
        ctx.fill();
        break;
      }
      case 'ring': {
        ctx.translate(effect.x, effect.y);
        const ringRadius = radius * (0.22 + easeOutCubic(progress) * 1.35);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(242, 234, 216, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([9, 9]);
        ctx.lineDashOffset = -time * 26;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * 0.72, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'level': {
        ctx.translate(effect.x, effect.y);
        ctx.strokeStyle = AMBER_BRIGHT;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i += 1) {
          const y = radius * 0.4 - progress * radius * 1.6 - i * radius * 0.34;
          const width = radius * (0.55 - i * 0.11);
          ctx.beginPath();
          ctx.moveTo(-width, y + radius * 0.24);
          ctx.lineTo(0, y);
          ctx.lineTo(width, y + radius * 0.24);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 200, 102, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, radius * 0.5);
        ctx.lineTo(0, -radius * 1.3);
        ctx.stroke();
        break;
      }
      case 'spawn': {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(time * 2 + progress * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.7 - progress * 0.35), 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 6; i += 1) {
          const a = (i * TAU) / 6;
          const d = radius * (0.25 + progress * 0.5);
          ctx.fillStyle = i % 2 === 0 ? color : INK;
          ctx.fillRect(Math.cos(a) * d - 1.5, Math.sin(a) * d - 1.5, 3, 3);
        }
        ctx.fillStyle = 'rgba(242, 234, 216, 0.16)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.22 * fade, 0, TAU);
        ctx.fill();
        break;
      }

      default:
        break;
    }
    ctx.restore();
  }

  private drawDamageText(ctx: CanvasRenderingContext2D, text: DamageText): void {
    const duration = Math.max(0.001, text.maxLife);
    const progress = clamp01(1 - text.life / duration);
    const fade = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    const size = text.crit ? 23 : 15;
    const rise = easeOutQuad(progress) * (text.crit ? 38 : 28);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = `700 ${size}px "SFMono-Regular", "Cascadia Code", Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = text.crit ? 4 : 3;
    ctx.strokeStyle = 'rgba(4, 9, 8, 0.92)';
    ctx.strokeText(String(Math.max(0, Math.floor(text.value))), text.x, text.y - rise);
    ctx.fillStyle = text.crit ? GOLD : INK;
    ctx.fillText(String(Math.max(0, Math.floor(text.value))), text.x, text.y - rise);
    if (text.crit) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(text.x - 16, text.y - rise + 13);
      ctx.lineTo(text.x + 16, text.y - rise + 13);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Boss ability telegraphs
  // ---------------------------------------------------------------------------

  private drawBossWarnings(
    ctx: CanvasRenderingContext2D,
    world: BattleWorld,
    time: number,
  ): void {
    let boss: EnemyEntity | null = null;
    if (world.bossId !== null) {
      for (const enemy of world.enemies) {
        if (enemy.id === world.bossId && !enemy.dead) {
          boss = enemy;
          break;
        }
      }
    }
    if (!boss) {
      for (const enemy of world.enemies) {
        if (enemy.boss && !enemy.dead) {
          boss = enemy;
          break;
        }
      }
    }
    if (!boss) return;

    if (boss.softEnrage) {
      const ringRadius = boss.radius + 36 + pulse(time, 4.4) * 15;
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.strokeStyle = 'rgba(255, 92, 92, 0.72)';
      ctx.lineWidth = 3;
      ctx.setLineDash([22, 14]);
      ctx.lineDashOffset = -time * 46;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const sweep = (time * 1.7) % TAU;
      ctx.strokeStyle = 'rgba(255, 154, 132, 0.86)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, sweep, sweep + 0.7);
      ctx.stroke();
      ctx.restore();
    }

    if (!boss.ability) return;

    if (boss.ability === 'dash' && (boss.mode === 'bossTelegraph' || boss.mode === 'bossDash')) {
      this.drawDashTelegraph(ctx, boss, time);
    } else if (
      boss.ability === 'barrage' &&
      (boss.mode === 'bossCharge' || boss.mode === 'bossCast' || boss.mode === 'bossTelegraph')
    ) {
      this.drawBarrageTelegraph(ctx, boss, time);
    } else if (
      boss.ability === 'summon' &&
      (boss.mode === 'bossSummon' || boss.mode === 'bossTelegraph')
    ) {
      this.drawSummonTelegraph(ctx, boss, time);
    }
  }

  private drawDashTelegraph(
    ctx: CanvasRenderingContext2D,
    boss: EnemyEntity,
    time: number,
  ): void {
    const targetX = boss.targetX || boss.x + boss.dirX * 260;
    const targetY = boss.targetY || boss.y + boss.dirY * 260;
    const angle = Math.atan2(targetY - boss.y, targetX - boss.x);
    const ready = boss.mode === 'bossDash' ? 1 : pulse(time, 12);
    const width = 90;
    const length = 180;

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(angle);
    const distance = Math.hypot(targetX - boss.x, targetY - boss.y);
    ctx.strokeStyle = 'rgba(255, 92, 92, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -time * 34;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(distance, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 1; i <= 3; i += 1) {
      const x = (distance * i) / 3.4;
      ctx.beginPath();
      ctx.moveTo(x - 5, -6);
      ctx.lineTo(x + 3, 0);
      ctx.lineTo(x - 5, 6);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(targetX, targetY);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(255, 92, 92, ${0.12 + ready * 0.18})`;
    ctx.fillRect(-length / 2, -width / 2, length, width);
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.lineDashOffset = -time * 30;
    ctx.strokeRect(-length / 2, -width / 2, length, width);
    ctx.setLineDash([]);
    // Center hazard chevrons keep the direction legible without color.
    ctx.strokeStyle = DANGER_BRIGHT;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 2) {
      const cx = i * length * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx - 9, -8);
      ctx.lineTo(cx + 2, 0);
      ctx.lineTo(cx - 9, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBarrageTelegraph(
    ctx: CanvasRenderingContext2D,
    boss: EnemyEntity,
    time: number,
  ): void {
    const charge = clamp01(1 - boss.modeTimer / 0.8);
    const radius = Math.max(30, boss.radius);
    this.drawGlow(ctx, boss.x, boss.y, radius * 2.4, DANGER, 0.16 + charge * 0.2);
    ctx.save();
    ctx.translate(boss.x, boss.y);
    for (let i = 0; i < 3; i += 1) {
      const phase = (time * 1.4 + i / 3) % 1;
      ctx.strokeStyle = `rgba(255, 92, 92, ${0.58 * (1 - phase)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius + phase * 100, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = DANGER_BRIGHT;
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i += 1) {
      const a = (i * TAU) / 16 + time * 0.4;
      const inner = radius + 16 + charge * 10;
      const outer = inner + (i % 2 === 0 ? 12 : 7);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.rotate(-time * 2.2);
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.72)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 26, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawSummonTelegraph(
    ctx: CanvasRenderingContext2D,
    boss: EnemyEntity,
    time: number,
  ): void {
    const tug = pulse(time, 9);
    for (let i = 0; i < 4; i += 1) {
      const a = Math.PI / 4 + (i * TAU) / 4;
      const x = boss.x + Math.cos(a) * (boss.radius + 74);
      const y = boss.y + Math.sin(a) * (boss.radius + 74);
      const radius = 18 + i * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(255, 92, 92, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -time * 24;
      ctx.beginPath();
      ctx.arc(0, 0, radius + tug * 5, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = DANGER_BRIGHT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.55, 0);
      ctx.lineTo(radius * 0.55, 0);
      ctx.moveTo(0, -radius * 0.55);
      ctx.lineTo(0, radius * 0.55);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 92, 92, 0.14)';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

function makeGridTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = 40;
  tile.height = 40;
  const ctx = tile.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = 'rgba(103, 232, 199, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(40, 0.5);
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, 40);
    ctx.stroke();
    ctx.fillStyle = 'rgba(103, 232, 199, 0.06)';
    ctx.fillRect(0, 0, 1, 1);
  }
  return tile;
}










