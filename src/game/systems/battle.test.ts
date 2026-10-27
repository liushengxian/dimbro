import { describe, expect, it } from 'vitest';
import { createRun } from './progression';
import { createBattle, updateBattle, type BattleInput } from './battle';
import { WAVES_BY_ID } from '../data/waves';
import { createRng } from '../core/rng';
import { BALANCE } from '../data/balance';

const idle: BattleInput = { up: false, down: false, left: false, right: false };

describe('battle simulation', () => {
  it('creates a wave with the starting weapon and full health', () => {
    const run = createRun('sunsetNeedle', 42);
    const world = createBattle(run, WAVES_BY_ID[1]);
    expect(world.wave).toBe(1);
    expect(world.player.hp).toBe(80);
    expect(world.weapons).toHaveLength(1);
    expect(world.weapons[0]?.id).toBe('pulseNailer');
    expect(world.enemies).toHaveLength(0);
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
    expect(boss?.hp).toBe(2200);
    expect(boss?.invuln).toBeGreaterThan(0);
    expect(world.enemies).toHaveLength(1);
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
});
