import { describe, expect, it } from 'vitest';
import { createRun } from './progression';
import { buildSpawnQueue, createBattle, updateBattle, type BattleInput } from './battle';
import { WAVES_BY_ID } from '../data/waves';
import { ENEMIES_BY_ID } from '../data/enemies';
import { createRng } from '../core/rng';
import { BALANCE } from '../data/balance';

const idle: BattleInput = { up: false, down: false, left: false, right: false };

describe('battle simulation', () => {
  it('creates a wave with the starting weapon and full health', () => {
    const run = createRun('sunsetNeedle', 42);
    const world = createBattle(run, WAVES_BY_ID[1]);
    expect(world.wave).toBe(1);
    expect(world.player.hp).toBe(65);
    expect(world.weapons).toHaveLength(1);
    expect(world.weapons[0]?.id).toBe('pulseNailer');
    expect(world.enemies).toHaveLength(0);
    expect(world.audioCues).toEqual([]);
  });

  it('spawns enemies and advances the wave without throwing', () => {
    const run = createRun('simon', 7);
    const world = createBattle(run, WAVES_BY_ID[3]);
    const rng = createRng(9);
    const input: BattleInput = { up: true, down: false, left: false, right: true };
    for (let step = 0; step < 60 * 6; step += 1) {
      const outcome = updateBattle(run, world, WAVES_BY_ID[3], 1 / 60, input, rng);
      if (outcome !== null) break;
    }
    expect(world.enemies.length).toBeGreaterThan(0);
    expect(world.elapsed).toBeGreaterThan(4);
  });

  it('queues weapon and boss audio cues during battle', () => {
    const run = createRun('sunsetNeedle', 11);
    run.wave = 8;
    const world = createBattle(run, WAVES_BY_ID[8]);
    expect(world.audioCues).toContain('bossIntro');

    world.audioCues = [];
    updateBattle(run, world, WAVES_BY_ID[8], 1 / 60, idle, createRng(4));
    expect(world.audioCues).toContain('weaponPulse');
  });

  it('returns waveClear when the timer expires', () => {
    const run = createRun('sunsetNeedle', 3);
    const world = createBattle(run, WAVES_BY_ID[1]);
    world.timeLeft = 0.01;
    const outcome = updateBattle(run, world, WAVES_BY_ID[1], 1 / 60, idle, createRng(1));
    expect(outcome).toBe('waveClear');
  });

  it('creates the boss wave with an invulnerable forge core', () => {
    const run = createRun('sunsetNeedle', 11);
    run.wave = 8;
    const world = createBattle(run, WAVES_BY_ID[8]);
    expect(world.bossWave).toBe(true);
    expect(world.bossId).not.toBeNull();
    const boss = world.enemies.find((enemy) => enemy.boss);
    expect(boss?.hp).toBe(2200 * BALANCE.enemyHpMultiplier);
    expect(boss?.invuln).toBeGreaterThan(0);
    expect(world.enemies).toHaveLength(1);
    expect(world.audioCues).toContain('bossIntro');
  });

  it('culls out-of-bounds projectiles and keeps counts bounded', () => {
    const run = createRun('sunsetNeedle', 12);
    const world = createBattle(run, WAVES_BY_ID[1]);
    world.playerProjectiles.push({
      id: 900,
      kind: 'player',
      x: -100,
      y: -100,
      vx: -10,
      vy: -10,
      radius: 3,
      damage: 1,
      crit: false,
      remainingPierce: 1,
      hitIds: new Set(),
      life: 0.1,
      maxLife: 0.1,
      weaponId: 'pulseNailer',
      attackId: 1,
      color: '#fff',
      returning: false,
      traveled: 0,
      maxDistance: 10,
      originX: 0,
      originY: 0,
      dead: false,
    });
    updateBattle(run, world, WAVES_BY_ID[1], 1 / 60, idle, createRng(2));
    expect(world.playerProjectiles).toHaveLength(0);
    expect(world.pickups.length).toBeLessThanOrEqual(BALANCE.maxPickups);
  });

  it('pre-generates a stable queue with the target unit count and hp', () => {
    for (const wave of Object.values(WAVES_BY_ID)) {
      const seed = 1000 + wave.wave;
      const queue = buildSpawnQueue(wave, createRng(seed));
      expect(queue).toHaveLength(wave.targetUnits);
      expect(buildSpawnQueue(wave, createRng(seed))).toEqual(queue);

      if (wave.boss) continue;
      const hpScale =
        (1 + BALANCE.enemyHpGrowth * (wave.wave - 1)) * BALANCE.enemyHpMultiplier;
      const eliteHp = wave.eliteAtPct.length * ENEMIES_BY_ID.overseer.hp * hpScale;
      const trashHp = queue.reduce(
        (total, id) => total + ENEMIES_BY_ID[id].hp * hpScale,
        0,
      );
      const target = Math.max(0, wave.targetHp - eliteHp);
      const tolerance = Math.max(24, target * 0.1);
      expect(Math.abs(trashHp - target)).toBeLessThanOrEqual(tolerance);
    }
  });

  it('applies damage-taken penalties from risk cards', () => {
    const run = createRun('sunsetNeedle', 31);
    run.upgrades = { glassCannon: 2 };
    const world = createBattle(run, WAVES_BY_ID[1]);
    world.hazards.push({
      id: 999,
      x: world.player.x,
      y: world.player.y,
      radius: 50,
      life: 1,
      tickTimer: 0,
      damage: 10,
      dead: false,
    });

    updateBattle(run, world, WAVES_BY_ID[1], 1 / 60, idle, createRng(5));
    expect(world.player.hp).toBeCloseTo(65 - 13);
  });

  it('builds the queue on the first update and exposes remaining spawns', () => {
    const run = createRun('sunsetNeedle', 21);
    const world = createBattle(run, WAVES_BY_ID[3]);
    expect(world.spawnQueue).toEqual([]);
    expect(world.spawnQueueBuilt).toBe(false);
    updateBattle(run, world, WAVES_BY_ID[3], 1 / 60, idle, createRng(4));
    expect(world.spawnQueueBuilt).toBe(true);
    expect(world.spawnRemaining).toBe(WAVES_BY_ID[3].targetUnits);
  });
});
