import { describe, expect, it } from 'vitest';

import { BALANCE } from '../data/balance';
import { WEAPONS_BY_ID } from '../data/weapons';
import type { PlayableCharacterId, PlayerStats, RunState } from '../types';
import {
  applyMaxHpBonus,
  awardCoins,
  baseStats,
  computePlayerStats,
  createRun,
  mitigateArmor,
  weaponCooldown,
  weaponDamage,
} from './progression';

function fullUpgradeRun(): RunState {
  const run = createRun('sunsetNeedle', 7);
  run.upgrades = {
    dmg: 2,
    atk: 1,
    move: 2,
    armor: 2,
    hp: 2,
    regen: 2,
    crit: 2,
    critdmg: 2,
    pickup: 2,
    range: 2,
    coin: 2,
    knockback: 1,
  };
  run.modules = {
    coolingFan: 1,
    hollowPoint: 2,
    servoBearing: 1,
    compositeArmor: 1,
    emergencyBattery: 1,
    repairArm: 1,
    magneticChassis: 1,
    tacticalLens: 1,
    coinAmplifier: 1,
    spareMagazine: 2,
  };
  return run;
}

describe('baseStats', () => {
  it('matches the v0.4 Sunset Needle baseline', () => {
    const stats = baseStats('sunsetNeedle');
    expect(stats).toEqual({
      maxHp: 65,
      armor: 0,
      damagePct: -0.05,
      attackSpeedPct: 0.2,
      moveSpeed: 235,
      moveSpeedPct: 0,
      critChance: 0.08,
      critDamagePct: 0.5,
      pickupRadius: 80,
      rangePct: 0,
      coinPct: 0,
      knockbackPct: 0,
      regen: 0,
      damageTakenPct: 0,
      cooldownMul: 1,
    });
  });

  it('matches the v0.4 Simon baseline', () => {
    const stats = baseStats('simon');
    expect(stats.maxHp).toBe(90);
    expect(stats.armor).toBe(1);
    expect(stats.damagePct).toBe(0);
    expect(stats.attackSpeedPct).toBe(0);
    expect(stats.moveSpeed).toBe(220);
    expect(stats.critChance).toBe(0.05);
    expect(stats.critDamagePct).toBe(0.5);
    expect(stats.pickupRadius).toBe(80);
    expect(stats.cooldownMul).toBe(1);
  });
});

describe('computePlayerStats', () => {
  it('adds Simon permanent +50% damage linearly', () => {
    const run = createRun('simon', 1);
    expect(computePlayerStats(run).damagePct).toBeCloseTo(0.5);

    const boosted = computePlayerStats(run, { damagePct: 0.15 });
    expect(boosted.damagePct).toBeCloseTo(0.65);
  });

  it('keeps Sunset Needle base -5% damage with no bonuses', () => {
    const run = createRun('sunsetNeedle', 1);
    expect(computePlayerStats(run).damagePct).toBeCloseTo(-0.05);
  });

  it('sums upgrades, modules and runtime modifiers', () => {
    const stats = computePlayerStats(fullUpgradeRun());

    expect(stats.maxHp).toBe(65 + 2 * 15 + 20);
    expect(stats.armor).toBe(2 * 2 + 2);
    expect(stats.damagePct).toBeCloseTo(-0.05 + 0.2 + 0.24);
    expect(stats.attackSpeedPct).toBeCloseTo(0.2 + 0.08 + 0.1);
    expect(stats.moveSpeed).toBe(235);
    expect(stats.moveSpeedPct).toBeCloseTo(0.14 + 0.08);
    expect(stats.critChance).toBeCloseTo(0.08 + 0.08 + 0.04);
    expect(stats.critDamagePct).toBeCloseTo(0.5 + 0.4);
    expect(stats.pickupRadius).toBe(80 + 60 + 35);
    expect(stats.regen).toBeCloseTo(1.2 + 0.5);
    expect(stats.rangePct).toBeCloseTo(0.16);
    expect(stats.coinPct).toBeCloseTo(0.45);
    expect(stats.knockbackPct).toBeCloseTo(0.25);
    expect(stats.cooldownMul).toBeCloseTo(0.96 ** 2);
  });

  it('applies runtime movement, crit and damage modifiers additively', () => {
    const run = createRun('sunsetNeedle', 1);
    const stats = computePlayerStats(run, {
      moveSpeedPct: 0.1,
      critChance: 0.08,
      damagePct: 0.15,
      attackSpeedPct: 0.1,
    });

    expect(stats.moveSpeedPct).toBeCloseTo(0.1);
    expect(stats.critChance).toBeCloseTo(0.16);
    expect(stats.damagePct).toBeCloseTo(0.1);
    expect(stats.attackSpeedPct).toBeCloseTo(0.3);
  });

  it('applies risk card upside and penalty together', () => {
    const run = createRun('sunsetNeedle', 1);
    run.upgrades = { overclock: 1, glassCannon: 2, shortCircuit: 1 };
    const stats = computePlayerStats(run);

    expect(stats.damagePct).toBeCloseTo(-0.05 + 0.2 + 0.5);
    expect(stats.damageTakenPct).toBeCloseTo(0.3);
    expect(stats.moveSpeedPct).toBeCloseTo(-0.06);
    expect(stats.attackSpeedPct).toBeCloseTo(0.2 + 0.2);
    expect(stats.rangePct).toBeCloseTo(-0.12);
  });

  it('caps attack speed at +150%', () => {
    const run = createRun('sunsetNeedle', 1);
    run.upgrades = { atk: 6 };
    const stats = computePlayerStats(run, { attackSpeedPct: 1 });
    expect(stats.attackSpeedPct).toBe(BALANCE.attackSpeedCap);
  });

  it('caps crit chance at 75%', () => {
    const run = createRun('sunsetNeedle', 1);
    run.upgrades = { crit: 6 };
    run.modules = { tacticalLens: 3 };
    const stats = computePlayerStats(run, { critChance: 1 });
    expect(stats.critChance).toBe(BALANCE.critCap);
  });

  it('never puts the RESET x5 attack-speed multiplier into attackSpeedPct', () => {
    const run = createRun('sunsetNeedle', 1);
    const stats = computePlayerStats(run, { attackSpeedMultiplier: 5 });
    expect(stats.attackSpeedPct).toBeCloseTo(0.2);
  });

  it('multiplies cooldownMul by spare magazines', () => {
    const run = createRun('sunsetNeedle', 1);
    run.modules = { spareMagazine: 3 };
    expect(computePlayerStats(run).cooldownMul).toBeCloseTo(0.96 ** 3);
  });

  it('applies an explicit cooldownMultiplier without touching attack speed', () => {
    const run = createRun('simon', 1);
    const stats = computePlayerStats(run, { cooldownMultiplier: 0.5 });
    expect(stats.cooldownMul).toBeCloseTo(0.5);
    expect(stats.attackSpeedPct).toBe(0);
  });
});

describe('weaponDamage', () => {
  const pulse = WEAPONS_BY_ID.pulseNailer;
  const sunset = () => computePlayerStats(createRun('sunsetNeedle', 1));

  it('applies base damage and damage bonus', () => {
    expect(weaponDamage(pulse, 1, sunset(), false)).toBeCloseTo(7 * 0.95);
  });

  it('applies crit multiplier 1.5 + critDamagePct', () => {
    const stats = sunset();
    expect(weaponDamage(pulse, 1, stats, true)).toBeCloseTo(7 * 0.95 * 2);
  });

  it('scales damage by 1.25 per weapon level', () => {
    const stats = sunset();
    expect(weaponDamage(pulse, 2, stats, false)).toBeCloseTo(7 * 0.95 * 1.25);
    expect(weaponDamage(pulse, 3, stats, false)).toBeCloseTo(7 * 0.95 * 1.25 ** 2);
  });

  it('adds upgrade crit damage to the crit multiplier', () => {
    const run = createRun('sunsetNeedle', 1);
    run.upgrades = { critdmg: 2 };
    const stats = computePlayerStats(run);
    expect(weaponDamage(pulse, 1, stats, true)).toBeCloseTo(7 * 0.95 * 2.4);
  });

  it('never drops below 1 damage and returns a float', () => {
    const weak = { ...pulse, baseDamage: 0.1 };
    const stats = baseStats('sunsetNeedle');
    stats.damagePct = -0.99;
    const damage = weaponDamage(weak, 1, stats, false);
    expect(damage).toBe(1);
    expect(weaponDamage(pulse, 1, sunset(), false)).toBeCloseTo(6.65);
  });
});

describe('weaponCooldown', () => {
  const pulse = WEAPONS_BY_ID.pulseNailer;
  const scatter = WEAPONS_BY_ID.scatterRivets;

  it('divides by attack speed and applies weapon level', () => {
    const stats = baseStats('sunsetNeedle');
    expect(weaponCooldown(pulse, 1, stats, false)).toBeCloseTo(0.55 / 1.2, 6);
    expect(weaponCooldown(pulse, 3, stats, false)).toBeCloseTo(
      (0.55 * 0.94 ** 2) / 1.2,
      6,
    );
  });

  it('applies spare-magazine cooldownMul', () => {
    const run = createRun('sunsetNeedle', 1);
    run.modules = { spareMagazine: 2 };
    const stats = computePlayerStats(run);
    expect(weaponCooldown(pulse, 1, stats, false)).toBeCloseTo(
      (0.55 * 0.96 ** 2) / 1.2,
      6,
    );
  });

  it('clamps normal cooldown to 0.12s before RESET', () => {
    const run = createRun('sunsetNeedle', 1);
    run.upgrades = { atk: 6 };
    const stats = computePlayerStats(run, { attackSpeedPct: 1 });
    const rapid = { ...pulse, cooldown: 0.2 };
    expect(weaponCooldown(rapid, 1, stats, false)).toBe(BALANCE.minCooldown);
  });

  it('divides by 5 during RESET after normal clamping', () => {
    const stats = baseStats('sunsetNeedle');
    expect(weaponCooldown(pulse, 1, stats, true)).toBeCloseTo(0.55 / 1.2 / 5, 6);

    const cappedRun = createRun('sunsetNeedle', 1);
    cappedRun.upgrades = { atk: 6 };
    const capped = computePlayerStats(cappedRun, { attackSpeedPct: 1 });
    expect(weaponCooldown(pulse, 1, capped, true)).toBe(BALANCE.resetMinCooldown);
  });

  it('never returns less than the RESET floor', () => {
    const stats = baseStats('sunsetNeedle');
    stats.attackSpeedPct = BALANCE.attackSpeedCap;
    stats.cooldownMul = 0;
    expect(weaponCooldown(scatter, 3, stats, true)).toBe(BALANCE.resetMinCooldown);
  });
});

describe('awardCoins', () => {
  it('carries fractional coin bonuses across pickups', () => {
    const run = createRun('sunsetNeedle', 1);
    let total = 0;
    for (let index = 0; index < 10; index += 1) {
      total += awardCoins(run, 1, 0.3);
    }
    expect(total).toBe(13);
    expect(run.coinRemainder).toBeCloseTo(0);
  });
});

describe('mitigateArmor', () => {
  it('applies diminishing armor reduction', () => {
    expect(mitigateArmor(10, 0)).toBe(10);
    expect(mitigateArmor(10, 10)).toBeCloseTo(7.5);
    expect(mitigateArmor(10, 30)).toBeCloseTo(5);
    expect(mitigateArmor(10, 1000)).toBe(1);
  });

  it('treats negative armor as zero and enforces minimum 1', () => {
    expect(mitigateArmor(10, -5)).toBe(10);
    expect(mitigateArmor(0.5, 0)).toBe(1);
    expect(mitigateArmor(10, Number.NaN)).toBe(10);
  });
});

describe('createRun', () => {
  it('creates a fresh Sunset Needle run', () => {
    const run = createRun('sunsetNeedle', 1234);
    expect(run).toEqual({
      seed: 1234,
      characterId: 'sunsetNeedle',
      wave: 1,
      coins: BALANCE.startingCoins,
      coinRemainder: 0,
      baggedCoins: 0,
      currentHp: 65,
      shields: 0,
      upgrades: {},
      modules: {},
      weapons: [{ id: 'pulseNailer', level: 1, paid: 28 }],
      totals: {
        kills: 0,
        damage: 0,
        bestHit: 0,
        elapsedSeconds: 0,
        coinsEarned: 0,
      },
    });
  });

  it('creates a fresh Simon run with his starting weapon', () => {
    const run = createRun('simon', 55);
    expect(run.currentHp).toBe(90);
    expect(run.weapons).toEqual([{ id: 'scatterRivets', level: 1, paid: 30 }]);
    expect(computePlayerStats(run).damagePct).toBeCloseTo(0.5);
  });

  it('returns independent objects for each run', () => {
    const a = createRun('sunsetNeedle', 1);
    const b = createRun('sunsetNeedle', 1);
    a.upgrades.dmg = 1;
    a.weapons[0]!.level = 3;
    expect(b.upgrades).toEqual({});
    expect(b.weapons[0]!.level).toBe(1);
  });

  it('rejects a disabled character', () => {
    expect(() => createRun('junyi' as PlayableCharacterId, 1)).toThrow(Error);
  });
});

describe('applyMaxHpBonus', () => {
  it('adds current HP without exceeding the new maximum', () => {
    const run = createRun('sunsetNeedle', 1);
    run.currentHp = 40;
    run.upgrades = { hp: 1 };
    applyMaxHpBonus(run, 15);
    expect(run.currentHp).toBe(55);
    expect(computePlayerStats(run).maxHp).toBe(80);
  });

  it('caps at the maximum instead of healing to full', () => {
    const run = createRun('sunsetNeedle', 1);
    run.currentHp = 80;
    run.upgrades = { hp: 1 };
    applyMaxHpBonus(run, 15);
    expect(run.currentHp).toBe(80);
  });

  it('works with module max-HP bonuses', () => {
    const run = createRun('simon', 1);
    run.currentHp = 90;
    run.modules = { emergencyBattery: 1 };
    applyMaxHpBonus(run, 20);
    expect(run.currentHp).toBe(110);
    expect(computePlayerStats(run).maxHp).toBe(110);
  });
});

describe('computed stats shape', () => {
  it('never mutates the run while computing', () => {
    const run = createRun('sunsetNeedle', 1);
    const snapshot: RunState = JSON.parse(JSON.stringify(run)) as RunState;
    const stats: PlayerStats = computePlayerStats(run);
    expect(run).toEqual(snapshot);
    expect(stats).not.toBe(computePlayerStats(run));
  });
});
