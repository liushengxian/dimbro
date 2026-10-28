import { BALANCE } from './data/balance';
import { CHARACTERS_BY_ID } from './data/characters';
import { MODULES_BY_ID } from './data/modules';
import { UPGRADES_BY_ID } from './data/upgrades';
import { WAVES_BY_ID } from './data/waves';
import { WEAPONS_BY_ID, weaponColorForLevel } from './data/weapons';
import { createRng, type Rng } from './core/rng';
import type { AudioCue } from './audio';
import { clearSave, writeSave } from '../app/lib/storage';
import type {
  BossHudState,
  BattleWorld,
  GamePhase,
  ModuleId,
  PassiveHudState,
  PlayerStats,
  PurchaseResult,
  ResultView,
  RunState,
  SaveData,
  SessionSnapshot,
  ShopView,
  UpgradeChoice,
  UpgradeId,
  WaveDef,
  WaveSummary,
  WeaponHudState,
  WeaponId,
} from './types';
import { BattleRenderer } from './renderer';
import {
  createBattle,
  damageEnemy,
  updateBattle,
  type BattleInput,
  type BattleOutcome,
} from './systems/battle';
import { applyMaxHpBonus, awardCoins, computePlayerStats, createRun } from './systems/progression';
import {
  buildShopView,
  generateShopOffers,
  nextRefreshCost,
  weaponSellRefund,
  type InternalShopOffer,
} from './systems/shop';
import { applyUpgrade, generateUpgradeChoices } from './systems/upgrades';

const STEP = 1 / 60;
const MAX_STEPS = 4;
const SNAPSHOT_INTERVAL = 1 / 20;

const EMPTY_INPUT: BattleInput = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function randomSeed(): number {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] ?? 1;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffff_ffff)) >>> 0;
}

function cloneRun(run: RunState): RunState {
  return {
    ...run,
    upgrades: { ...run.upgrades },
    modules: { ...run.modules },
    weapons: run.weapons.map((weapon) => ({ ...weapon })),
    totals: { ...run.totals },
  };
}

function emptyInput(): BattleInput {
  return { ...EMPTY_INPUT };
}

export class GameSession {
  private renderer: BattleRenderer | null = null;
  private run: RunState | null = null;
  private world: BattleWorld | null = null;
  private waveDef: WaveDef | null = null;
  private phase: GamePhase = 'idle';
  private paused = false;
  private rng: Rng = createRng(1);
  private input: BattleInput = emptyInput();
  private listeners = new Set<() => void>();
  private version = 0;
  private snapshotCache: SessionSnapshot | null = null;
  private snapshotVersion = -1;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private notifyAccumulator = 0;
  private fps = 60;
  private fpsFrames = 0;
  private fpsElapsed = 0;
  private destroyed = false;
  private upgradeChoices: UpgradeChoice[] = [];
  private shopOffers: InternalShopOffer[] = [];
  private refreshCost: number = BALANCE.shopRefreshBase;
  private pendingOfferId: string | null = null;
  private waveSummary: WaveSummary | null = null;
  private result: ResultView | null = null;
  private audioListener: ((cue: AudioCue) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
      document.addEventListener('visibilitychange', this.handleVisibility);
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setAudioListener(listener: ((cue: AudioCue) => void) | null): void {
    this.audioListener = listener;
  }

  getSnapshot = (): SessionSnapshot => {
    if (this.snapshotCache !== null && this.snapshotVersion === this.version) {
      return this.snapshotCache;
    }
    this.snapshotCache = this.buildSnapshot();
    this.snapshotVersion = this.version;
    return this.snapshotCache;
  };

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.renderer?.destroy();
    this.renderer = new BattleRenderer(canvas);
    this.renderOnce();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.renderer?.destroy();
    this.renderer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    this.listeners.clear();
  }

  startNewRun(characterId: RunState['characterId']): void {
    const seed = randomSeed();
    this.rng = createRng(seed);
    this.run = createRun(characterId, seed);
    this.result = null;
    this.waveSummary = null;
    this.startBattle();
  }

  continueRun(save: SaveData): void {
    this.run = cloneRun(save.run);
    this.rng = createRng(save.run.seed);
    this.rng.setState(save.rngState);
    this.result = null;
    this.waveSummary = null;
    this.startBattle();
  }

  togglePause(): void {
    if (this.phase !== 'battle') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.input = emptyInput();
      this.accumulator = 0;
    }
    this.emitAudio(this.paused ? 'pause' : 'resume');
    this.publish();
  }

  pause(): void {
    if (this.phase !== 'battle' || this.paused) return;
    this.paused = true;
    this.input = emptyInput();
    this.accumulator = 0;
    this.emitAudio('pause');
    this.publish();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.emitAudio('resume');
    this.publish();
  }

  beginUpgrade(): void {
    if (this.phase !== 'waveClear' || this.run === null) return;
    this.upgradeChoices = generateUpgradeChoices(this.run, this.rng);
    this.phase = 'upgrade';
    this.publish();
  }

  chooseUpgrade(id: UpgradeChoice['id']): void {
    if (this.phase !== 'upgrade' || this.run === null) return;
    const choice = this.upgradeChoices.find((item) => item.id === id);
    if (!choice) return;
    applyUpgrade(this.run, id);
    this.upgradeChoices = [];
    this.emitAudio('upgrade');
    this.openShop();
  }

  skipUpgrade(): void {
    if (this.phase !== 'upgrade' || this.run === null) return;
    this.run.coins += BALANCE.skipUpgradeCoins;
    this.run.totals.coinsEarned += BALANCE.skipUpgradeCoins;
    this.upgradeChoices = [];
    this.emitAudio('upgrade');
    this.openShop();
  }

  refreshShop(): PurchaseResult {
    if (this.phase !== 'shop' || this.run === null) {
      return { status: 'error', message: '商店尚未开启。' };
    }
    if (this.run.coins < this.refreshCost) {
      this.emitAudio('deny');
      return { status: 'error', message: `金币不足，刷新需要 ${this.refreshCost}。` };
    }
    this.run.coins -= this.refreshCost;
    this.refreshCost = nextRefreshCost(this.refreshCost);
    this.shopOffers = generateShopOffers(this.run, this.rng);
    this.pendingOfferId = null;
    this.emitAudio('purchase');
    this.publish();
    return { status: 'ok' };
  }

  buyOffer(offerId: string): PurchaseResult {
    if (this.phase !== 'shop' || this.run === null) {
      return { status: 'error', message: '商店尚未开启。' };
    }
    if (this.pendingOfferId !== null) {
      return { status: 'error', message: '请先完成当前武器替换。' };
    }
    const offer = this.shopOffers.find((item) => item.id === offerId);
    if (!offer || offer.sold) {
      this.emitAudio('deny');
      return { status: 'error', message: '该商品已经售出。' };
    }
    if (this.run.coins < offer.price) {
      this.emitAudio('deny');
      return { status: 'error', message: `金币不足，需要 ${offer.price}。` };
    }

    if (offer.kind === 'module') {
      const def = MODULES_BY_ID[offer.refId as ModuleId];
      const count = this.run.modules[def.id] ?? 0;
      if (count >= def.maxStacks) {
        this.emitAudio('deny');
        return { status: 'error', message: '该模块已达到持有上限。' };
      }
      this.run.coins -= offer.price;
      this.run.modules[def.id] = count + 1;
      if (def.effect.kind === 'maxHp') {
        applyMaxHpBonus(this.run, def.effect.heal ?? def.effect.value);
      }
      offer.sold = true;
      this.emitAudio('purchase');
      this.publish();
      return { status: 'ok' };
    }

    const ownedIndex = this.run.weapons.findIndex((weapon) => weapon.id === offer.refId);
    if (ownedIndex >= 0) {
      const owned = this.run.weapons[ownedIndex];
      if (!owned) return { status: 'error', message: '武器数据异常。' };
      if (owned.level >= BALANCE.maxWeaponLevel) {
        this.emitAudio('deny');
        return { status: 'error', message: '该武器已满级。' };
      }
      this.run.coins -= offer.price;
      owned.level += 1;
      owned.paid += offer.price;
      offer.sold = true;
      this.emitAudio('purchase');
      this.publish();
      return { status: 'ok' };
    }

    if (this.run.weapons.length >= BALANCE.maxWeapons) {
      this.pendingOfferId = offerId;
      this.publish();
      return { status: 'needs-slot' };
    }

    this.run.coins -= offer.price;
    this.run.weapons.push({
      id: offer.refId as WeaponId,
      level: 1,
      paid: offer.price,
    });
    offer.sold = true;
    this.emitAudio('purchase');
    this.publish();
    return { status: 'ok' };
  }

  cancelPendingPurchase(): void {
    if (this.pendingOfferId === null) return;
    this.pendingOfferId = null;
    this.publish();
  }

  replaceWeapon(slotIndex: number): void {
    if (this.phase !== 'shop' || this.run === null || this.pendingOfferId === null) return;
    const offer = this.shopOffers.find((item) => item.id === this.pendingOfferId);
    if (!offer || offer.kind !== 'weapon') {
      this.pendingOfferId = null;
      this.publish();
      return;
    }
    const replaced = this.run.weapons[slotIndex];
    if (!replaced) return;
    if (this.run.coins < offer.price) {
      this.pendingOfferId = null;
      this.publish();
      return;
    }

    const refund = weaponSellRefund(replaced);
    this.run.coins -= offer.price;
    this.run.coins += refund;
    this.run.weapons[slotIndex] = {
      id: offer.refId as WeaponId,
      level: 1,
      paid: offer.price,
    };
    offer.sold = true;
    this.pendingOfferId = null;
    this.emitAudio('purchase');
    this.publish();
  }

  sellWeapon(slotIndex: number): PurchaseResult {
    if (this.phase !== 'shop' || this.run === null) {
      return { status: 'error', message: '商店尚未开启。' };
    }
    if (this.run.weapons.length <= 1) {
      this.emitAudio('deny');
      return { status: 'error', message: '至少保留一把武器。' };
    }
    const weapon = this.run.weapons[slotIndex];
    if (!weapon) return { status: 'error', message: '该槽位没有武器。' };
    const refund = weaponSellRefund(weapon);
    this.run.weapons.splice(slotIndex, 1);
    this.run.coins += refund;
    this.emitAudio('purchase');
    this.publish();
    return { status: 'ok' };
  }

  nextWave(): void {
    if (this.phase !== 'shop' || this.run === null) return;
    this.run.wave = Math.min(BALANCE.waveCount, this.run.wave + 1);
    this.startBattle();
  }

  returnHome(): void {
    this.phase = 'idle';
    this.paused = false;
    this.run = null;
    this.world = null;
    this.waveDef = null;
    this.waveSummary = null;
    this.upgradeChoices = [];
    this.shopOffers = [];
    this.pendingOfferId = null;
    this.result = null;
    this.input = emptyInput();
    this.publish();
    this.renderOnce();
  }

  restartSameCharacter(): void {
    if (this.run === null) return;
    const characterId = this.run.characterId;
    this.startNewRun(characterId);
  }

  debugAddCoins(amount: number): void {
    if (this.run === null) return;
    this.run.coins = Math.max(0, this.run.coins + amount);
    this.publish();
  }

  debugJumpToWave(wave: number): void {
    if (this.run === null) return;
    this.run.wave = Math.max(1, Math.min(BALANCE.waveCount, Math.floor(wave)));
    this.startBattle();
  }

  debugFinishWave(): void {
    if (this.phase !== 'battle' || this.world === null) return;
    if (this.world.bossWave) {
      this.world.bossDefeated = true;
      this.world.victoryTimer = 0.1;
    } else {
      this.world.timeLeft = 0.01;
    }
    this.publish();
  }

  debugSetBossHp(fraction: number): void {
    if (this.phase !== 'battle' || this.world === null || this.run === null) return;
    const boss = this.world.enemies.find((enemy) => enemy.boss && !enemy.dead);
    if (!boss) return;
    boss.invuln = 0;
    boss.hp = Math.max(1, boss.maxHp * Math.max(0.01, Math.min(1, fraction)));
    damageEnemy(this.world, this.run, boss, 1, {
      canBounce: false,
      source: 'direct',
    });
    this.publish();
  }

  debugSetBossElapsed(seconds: number): void {
    if (this.phase !== 'battle' || this.world === null) return;
    this.world.elapsed = Math.max(0, seconds);
    this.publish();
  }

  debugTriggerReset(): void {
    if (this.phase !== 'battle' || this.world === null || this.run === null) return;
    if (this.run.characterId !== 'sunsetNeedle') return;
    this.world.passive.resetActive = true;
    this.world.passive.resetRemaining = BALANCE.resetDuration;
    this.world.passive.resetMax = BALANCE.resetMaxDuration;
    this.publish();
  }

  private startBattle(): void {
    if (this.run === null) return;
    const wave = WAVES_BY_ID[this.run.wave];
    if (!wave) {
      this.finishRun(true);
      return;
    }
    this.waveDef = wave;
    this.world = createBattle(this.run, wave);
    this.phase = 'battle';
    this.paused = false;
    this.waveSummary = null;
    this.upgradeChoices = [];
    this.shopOffers = [];
    this.pendingOfferId = null;
    this.result = null;
    this.input = emptyInput();
    this.accumulator = 0;
    this.lastTime = 0;
    this.notifyAccumulator = 0;
    this.saveCurrent();
    this.emitAudio('waveStart');
    this.flushWorldAudio();
    this.publish();
    this.renderOnce();
  }

  private saveCurrent(): void {
    if (this.run === null) return;
    const run = cloneRun(this.run);
    if (this.world !== null) {
      run.currentHp = Math.max(0, Math.min(computePlayerStats(run).maxHp, this.world.player.hp));
      this.run.currentHp = run.currentHp;
    }
    writeSave({
      version: 1,
      savedAt: Date.now(),
      rngState: this.rng.getState(),
      run,
    });
  }

  private finishWave(): void {
    if (this.run === null || this.world === null || this.waveDef === null) return;
    const run = this.run;
    const world = this.world;
    const stats = computePlayerStats(run);
    run.currentHp = Math.max(0, world.player.hp);

    let repaired = 0;
    let bagged = 0;
    let bossBagRecovered = 0;
    if (run.characterId === 'simon') {
      for (const pickup of world.pickups) {
        const award = awardCoins(run, pickup.value, stats.coinPct);
        repaired += award;
        run.coins += award;
        run.totals.coinsEarned += award;
      }
      world.pickups = [];
      const gain = Math.min(
        BALANCE.simonMaxShields - run.shields,
        Math.floor(repaired / BALANCE.simonShieldCoins),
      );
      run.shields += gain;
      world.waveStats.simonRepairCoins = repaired;
      world.waveStats.shieldsGained = gain;
    } else {
      bagged = world.pickups.reduce((sum, pickup) => sum + pickup.value, 0);
      run.baggedCoins += bagged;
      world.pickups = [];
      world.waveStats.baggedCoins = bagged;
    }

    const nextWave = WAVES_BY_ID[run.wave + 1];
    if (nextWave?.boss) {
      bossBagRecovered = run.baggedCoins;
      if (bossBagRecovered > 0) {
        run.baggedCoins = 0;
        run.coins += bossBagRecovered;
        run.totals.coinsEarned += bossBagRecovered;
      }
    }

    const reward = this.waveDef.reward;
    run.coins += reward;
    run.totals.coinsEarned += reward;
    world.waveStats.reward = reward;

    this.waveSummary = {
      wave: world.wave,
      pickedCoins: world.waveStats.pickedCoins,
      reward,
      simonRepairCoins: world.waveStats.simonRepairCoins,
      baggedCoins: bagged,
      baggedTotal: run.baggedCoins,
      bossBagRecovered,
      shieldsGained: world.waveStats.shieldsGained,
      kills: world.waveStats.kills,
      damage: world.waveStats.damage,
      duration: world.waveStats.duration,
    };
    this.phase = 'waveClear';
    this.paused = false;
    this.input = emptyInput();
    this.emitAudio('waveClear');
    this.publish();
    this.renderOnce();
  }

  private openShop(): void {
    if (this.run === null) return;
    this.shopOffers = generateShopOffers(this.run, this.rng);
    this.refreshCost = BALANCE.shopRefreshBase;
    this.pendingOfferId = null;
    this.phase = 'shop';
    this.waveSummary = null;
    this.publish();
    this.renderOnce();
  }

  private finishRun(victory: boolean): void {
    if (this.run === null) return;
    if (this.world !== null) {
      this.run.currentHp = Math.max(0, this.world.player.hp);
    }
    this.phase = victory ? 'victory' : 'defeat';
    this.paused = false;
    this.input = emptyInput();
    this.result = this.buildResult(victory);
    this.emitAudio(victory ? 'victory' : 'defeat');
    clearSave();
    this.publish();
    this.renderOnce();
  }

  private buildResult(victory: boolean): ResultView {
    const run = this.run as RunState;
    const stats = computePlayerStats(run);
    const character = CHARACTERS_BY_ID[run.characterId];
    const upgrades = Object.entries(run.upgrades)
      .filter(([, stacks]) => (stacks ?? 0) > 0)
      .map(([id, stacks]) => ({
        id: id as UpgradeId,
        name: UPGRADES_BY_ID[id as UpgradeId]?.name ?? id,
        stacks: stacks ?? 0,
      }));
    const modules = Object.entries(run.modules)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([id, count]) => ({
        id: id as ModuleId,
        name: MODULES_BY_ID[id as ModuleId]?.name ?? id,
        count: count ?? 0,
      }));
    return {
      victory,
      characterId: run.characterId,
      wave: victory ? BALANCE.waveCount : run.wave,
      kills: run.totals.kills,
      damage: run.totals.damage,
      bestHit: run.totals.bestHit,
      elapsedSeconds: run.totals.elapsedSeconds,
      remainingHp: Math.max(0, Math.floor(run.currentHp)),
      maxHp: stats.maxHp,
      coins: run.coins,
      coinsEarned: run.totals.coinsEarned,
      shields: run.shields,
      weapons: run.weapons.map((weapon) => ({
        id: weapon.id,
        name: WEAPONS_BY_ID[weapon.id].name,
        level: weapon.level,
      })),
      upgrades,
      modules,
      characterName: character.name,
    };
  }

  private buildSnapshot(): SessionSnapshot {
    const run = this.run;
    const world = this.world;
    const waveDef = this.waveDef;
    const stats = run ? this.snapshotStats(run, world) : null;
    const duration = waveDef?.duration ?? null;
    const timeLeft = world?.timeLeft ?? (duration ?? 0);
    const progress =
      duration !== null && duration > 0
        ? Math.max(0, Math.min(1, 1 - timeLeft / duration))
        : 0;
    const weapons: WeaponHudState[] = run
      ? run.weapons.map((weapon) => {
          const def = WEAPONS_BY_ID[weapon.id];
          const runtime = world?.weapons.find((item) => item.id === weapon.id);
          return {
            id: weapon.id,
            name: def.name,
            icon: def.icon,
            level: weapon.level,
            cooldown: runtime?.cooldown ?? 0,
            cooldownTotal: runtime?.cooldownTotal ?? 1,
            color: weaponColorForLevel(def, weapon.level),
          };
        })
      : [];
    const passives: PassiveHudState | null = run
      ? {
          resetActive: run.characterId === 'sunsetNeedle' && (world?.passive.resetActive ?? false),
          resetRemaining: world?.passive.resetRemaining ?? 0,
          resetMax: BALANCE.resetMaxDuration,
          lightTrailActive:
            run.characterId === 'sunsetNeedle' && (world?.passive.lightTrailActive ?? false),
          moveHold: world?.passive.moveHold ?? 0,
          idleTime: world?.passive.idleTime ?? 0,
          simonShields: run.characterId === 'simon' ? run.shields : 0,
        }
      : null;
    const bossEnemy = world?.enemies.find((enemy) => enemy.boss && !enemy.dead) ?? null;
    const boss: BossHudState | null = bossEnemy
      ? {
          hp: Math.max(0, bossEnemy.hp),
          maxHp: bossEnemy.maxHp,
          phase: bossEnemy.phase,
          enraged: bossEnemy.softEnrage,
        }
      : null;
    const shop: ShopView | null =
      this.phase === 'shop' && run
        ? buildShopView(run, this.shopOffers, this.refreshCost, this.pendingOfferId)
        : null;

    return {
      version: this.version,
      phase: this.phase,
      paused: this.paused,
      run,
      wave: run?.wave ?? 0,
      waveLabel: waveDef?.label ?? '待命',
      waveTimeLeft: Math.max(0, timeLeft),
      waveDuration: duration,
      waveProgress: progress,
      bossWave: waveDef?.boss ?? false,
      player: {
        hp: world?.player.hp ?? (run?.currentHp ?? 0),
        maxHp: stats?.maxHp ?? 0,
        armor: stats?.armor ?? 0,
        iframes: world?.player.iframes ?? 0,
        lowHp:
          world !== null && stats !== null
            ? world.player.hp / Math.max(1, stats.maxHp) < 0.3
            : false,
      },
      stats,
      coins: run?.coins ?? 0,
      baggedCoins: run?.baggedCoins ?? 0,
      weapons,
      passives,
      boss,
      waveSummary: this.phase === 'waveClear' ? this.waveSummary : null,
      upgradeChoices: this.phase === 'upgrade' ? this.upgradeChoices : [],
      shop,
      result: this.phase === 'victory' || this.phase === 'defeat' ? this.result : null,
      debug: {
        fps: Math.round(this.fps),
        enemies: world?.enemies.length ?? 0,
        playerProjectiles: world?.playerProjectiles.length ?? 0,
        enemyProjectiles: world?.enemyProjectiles.length ?? 0,
        pickups: world?.pickups.length ?? 0,
        spawnRemaining: world ? (world.bossWave ? 0 : Number.POSITIVE_INFINITY) : 0,
        seed: run?.seed ?? 0,
        wave: run?.wave ?? 0,
        phase: this.phase,
      },
    };
  }

  private snapshotStats(run: RunState, world: BattleWorld | null): PlayerStats {
    return computePlayerStats(run, {
      damagePct: world?.passive.resetActive ? BALANCE.resetDamageBonus : 0,
      moveSpeedPct: world?.passive.lightTrailActive ? BALANCE.lightTrailMoveSpeedPct : 0,
      critChance: world?.passive.lightTrailActive ? BALANCE.lightTrailCritChance : 0,
    });
  }

  private publish(): void {
    this.version += 1;
    this.snapshotCache = null;
    for (const listener of this.listeners) listener();
  }

  private emitAudio(cue: AudioCue): void {
    if (this.audioListener === null) return;
    try {
      this.audioListener(cue);
    } catch {
      // 音频故障不应中断战斗循环。
    }
  }

  private flushWorldAudio(): void {
    const world = this.world;
    if (world === null || world.audioCues.length === 0) return;
    const cues = world.audioCues.splice(0, world.audioCues.length);
    for (const cue of cues) this.emitAudio(cue);
  }

  private loop = (time: number): void => {
    if (this.destroyed) return;
    if (this.lastTime === 0) this.lastTime = time;
    const frame = Math.min(0.25, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.fpsElapsed += frame;
    this.fpsFrames += 1;
    if (this.fpsElapsed >= 0.5) {
      this.fps = this.fpsFrames / this.fpsElapsed;
      this.fpsElapsed = 0;
      this.fpsFrames = 0;
    }

    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS) {
      this.step(STEP);
      this.accumulator -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS) this.accumulator = 0;

    if (this.phase === 'battle' && !this.paused) {
      this.notifyAccumulator += frame;
      if (this.notifyAccumulator >= SNAPSHOT_INTERVAL) {
        this.notifyAccumulator = 0;
        this.publish();
      }
    }

    this.render(this.accumulator / STEP);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(dt: number): void {
    if (this.phase !== 'battle' || this.paused || this.run === null || this.world === null) {
      return;
    }
    if (this.waveDef === null) return;
    this.run.totals.elapsedSeconds += dt;
    const outcome: BattleOutcome = updateBattle(
      this.run,
      this.world,
      this.waveDef,
      dt,
      this.input,
      this.rng,
    );
    this.flushWorldAudio();
    if (outcome === 'waveClear') this.finishWave();
    else if (outcome === 'victory') this.finishRun(true);
    else if (outcome === 'defeat') this.finishRun(false);
  }

  private render(alpha: number): void {
    if (this.renderer === null) return;
    this.renderer.render(
      this.world,
      this.run,
      this.run ? this.snapshotStats(this.run, this.world) : null,
      alpha,
    );
  }

  private renderOnce(): void {
    this.render(0);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      return;
    }

    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (this.phase === 'battle') {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (this.phase !== 'battle' || this.paused) return;

    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = true;
        event.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = true;
        event.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        event.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      default:
        break;
    }
  };

  private handleBlur = (): void => {
    if (this.phase === 'battle' && !this.paused) this.pause();
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === 'hidden' && this.phase === 'battle' && !this.paused) {
      this.pause();
    }
  };
}
