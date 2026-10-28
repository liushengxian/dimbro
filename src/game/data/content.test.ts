import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { CHARACTER_LIST, CHARACTERS_BY_ID, PLAYABLE_CHARACTERS } from './characters';
import { ENEMIES_BY_ID, ENEMY_LIST } from './enemies';
import { MODULE_LIST, MODULES_BY_ID } from './modules';
import { UPGRADE_LIST, UPGRADES_BY_ID } from './upgrades';
import { WAVE_LIST, WAVES_BY_ID } from './waves';
import { WEAPON_LIST, WEAPONS_BY_ID, weaponColorForLevel } from './weapons';

function expectIdsMatch<T extends { id: string }>(
  list: readonly T[],
  byId: Readonly<Record<string, T>>,
): void {
  expect(Object.keys(byId)).toHaveLength(list.length);
  for (const def of list) {
    expect(byId[def.id]).toBe(def);
  }
}

describe('content counts', () => {
  it('matches the v0.4 content table sizes', () => {
    expect(UPGRADE_LIST).toHaveLength(18);
    expect(MODULE_LIST).toHaveLength(10);
    expect(WEAPON_LIST).toHaveLength(5);
    expect(ENEMY_LIST).toHaveLength(6);
    expect(WAVE_LIST).toHaveLength(8);
    expect(CHARACTER_LIST).toHaveLength(3);
  });
});

describe('balance baseline', () => {
  it('keeps the documented world, economy, and combat caps', () => {
    expect(BALANCE.worldWidth).toBe(1600);
    expect(BALANCE.worldHeight).toBe(900);
    expect(BALANCE.startingCoins).toBe(15);
    expect(BALANCE.waveCount).toBe(8);
    expect(BALANCE.enemyCap).toBe(60);
    expect(BALANCE.enemyHpMultiplier).toBe(0.8);
    expect(BALANCE.maxPickups).toBe(100);
    expect(BALANCE.maxWeapons).toBe(4);
    expect(BALANCE.maxWeaponLevel).toBe(3);
    expect(BALANCE.moduleMaxStacks).toBe(3);
    expect(BALANCE.critCap).toBe(0.75);
    expect(BALANCE.attackSpeedCap).toBe(1.5);
    expect(BALANCE.resetSpeedMultiplier).toBe(5);
  });
});

describe('characters', () => {
  it('exposes two playable characters and keeps Junyi disabled', () => {
    expect(PLAYABLE_CHARACTERS.map((character) => character.id)).toEqual([
      'sunsetNeedle',
      'simon',
    ]);
    expect(PLAYABLE_CHARACTERS).toHaveLength(2);
    expect(CHARACTERS_BY_ID.junyi.enabled).toBe(false);
    expect(PLAYABLE_CHARACTERS.every((character) => character.enabled)).toBe(true);
  });

  it('matches the documented base stats and starting weapons', () => {
    const sunset = CHARACTERS_BY_ID.sunsetNeedle;
    expect(sunset.base).toEqual({
      maxHp: 65,
      armor: 0,
      moveSpeed: 235,
      damagePct: -0.05,
      attackSpeedPct: 0.2,
      critChance: 0.08,
    });
    expect(sunset.startingWeaponId).toBe('pulseNailer');
    expect(sunset.difficulty).toBe(3);

    const simon = CHARACTERS_BY_ID.simon;
    expect(simon.base).toEqual({
      maxHp: 90,
      armor: 1,
      moveSpeed: 220,
      damagePct: 0,
      attackSpeedPct: 0,
      critChance: 0.05,
    });
    expect(simon.startingWeaponId).toBe('scatterRivets');
    expect(simon.difficulty).toBe(1);
  });

  it('gives every playable programmer two complete passives', () => {
    for (const character of PLAYABLE_CHARACTERS) {
      expect(character.passives).toHaveLength(2);
      for (const passive of character.passives) {
        expect(passive.id.length).toBeGreaterThan(0);
        expect(passive.name.length).toBeGreaterThan(0);
        expect(passive.summary.length).toBeGreaterThan(0);
        expect(passive.description.length).toBeGreaterThan(passive.summary.length);
      }
    }
    expect(CHARACTERS_BY_ID.sunsetNeedle.passives.map((passive) => passive.name)).toEqual([
      'RESET',
      '光轨追焦',
    ]);
    expect(CHARACTERS_BY_ID.simon.passives.map((passive) => passive.name)).toEqual([
      'Simon太强了',
      'Simon今天会修的',
    ]);
  });

  it('keeps character ids and map keys consistent', () => {
    expectIdsMatch(CHARACTER_LIST, CHARACTERS_BY_ID);
  });
});

describe('weapons', () => {
  it('matches the documented prices', () => {
    expect(Object.fromEntries(WEAPON_LIST.map((weapon) => [weapon.id, weapon.price]))).toEqual({
      pulseNailer: 28,
      scatterRivets: 30,
      arcHammer: 34,
      returnGear: 32,
      railSpike: 36,
    });
  });

  it('matches the documented combat values', () => {
    expect(WEAPONS_BY_ID.pulseNailer).toMatchObject({
      behavior: 'projectile',
      baseDamage: 7,
      cooldown: 0.55,
      range: 520,
      projectileSpeed: 900,
      projectileRadius: 3,
      pierce: 0,
    });
    expect(WEAPONS_BY_ID.scatterRivets).toMatchObject({
      behavior: 'shotgun',
      baseDamage: 2.6,
      pelletCount: 5,
      cooldown: 1.1,
      range: 300,
      projectileSpeed: 780,
      spreadDeg: 26,
    });
    expect(WEAPONS_BY_ID.arcHammer).toMatchObject({
      behavior: 'melee',
      baseDamage: 16,
      cooldown: 0.9,
      range: 85,
      spreadDeg: 120,
      knockback: 160,
    });
    expect(WEAPONS_BY_ID.returnGear).toMatchObject({
      behavior: 'boomerang',
      baseDamage: 8,
      cooldown: 1.5,
      range: 700,
      projectileSpeed: 620,
      projectileRadius: 7,
      pierce: 3,
    });
    expect(WEAPONS_BY_ID.railSpike).toMatchObject({
      behavior: 'rail',
      baseDamage: 14,
      cooldown: 1.6,
      range: 760,
      projectileSpeed: 1200,
      projectileRadius: 4,
      pierce: 2,
    });
  });

  it('keeps weapon ids and map keys consistent', () => {
    expectIdsMatch(WEAPON_LIST, WEAPONS_BY_ID);
  });

  it('gives every weapon a distinct color for each upgrade level', () => {
    for (const def of WEAPON_LIST) {
      const colors = [
        weaponColorForLevel(def, 1),
        weaponColorForLevel(def, 2),
        weaponColorForLevel(def, 3),
      ];
      expect(colors[0]).toBe(def.color);
      expect(colors[1]).toBe(def.upgradeColors[0]);
      expect(colors[2]).toBe(def.upgradeColors[1]);
      expect(new Set(colors).size).toBe(3);
    }
  });

  it('clamps weapon color levels to the supported 1-3 range', () => {
    const def = WEAPONS_BY_ID.pulseNailer;
    expect(weaponColorForLevel(def, 0)).toBe(def.color);
    expect(weaponColorForLevel(def, -4)).toBe(def.color);
    expect(weaponColorForLevel(def, 2.9)).toBe(def.upgradeColors[0]);
    expect(weaponColorForLevel(def, 99)).toBe(def.upgradeColors[1]);
    expect(weaponColorForLevel(def, Number.NaN)).toBe(def.color);
  });
});

describe('upgrades', () => {
  it('matches the documented max stacks', () => {
    expect(Object.fromEntries(UPGRADE_LIST.map((upgrade) => [upgrade.id, upgrade.maxStacks]))).toEqual({
      dmg: 6,
      atk: 6,
      move: 5,
      armor: 5,
      hp: 5,
      regen: 4,
      crit: 6,
      critdmg: 4,
      pickup: 4,
      range: 3,
      coin: 3,
      knockback: 3,
      overclock: 3,
      overdrive: 3,
      heavyArmor: 3,
      greed: 3,
      glassCannon: 2,
      shortCircuit: 3,
    });
  });

  it('maps effects to stat kinds and heals on max hp cards', () => {
    expect(UPGRADES_BY_ID.dmg.effect).toEqual({ kind: 'damagePct', value: 0.1 });
    expect(UPGRADES_BY_ID.atk.effect).toEqual({ kind: 'attackSpeedPct', value: 0.08 });
    expect(UPGRADES_BY_ID.armor.effect).toEqual({ kind: 'armor', value: 2 });
    expect(UPGRADES_BY_ID.hp.effect).toEqual({ kind: 'maxHp', value: 15, heal: 15 });
    expect(UPGRADES_BY_ID.critdmg.effect).toEqual({ kind: 'critDamagePct', value: 0.2 });
    expect(UPGRADES_BY_ID.pickup.effect).toEqual({ kind: 'pickupRadius', value: 30 });
    expect(UPGRADES_BY_ID.coin.effect).toEqual({ kind: 'coinPct', value: 0.15 });
  });

  it('keeps risk cards paired with a penalty', () => {
    for (const def of UPGRADE_LIST) {
      expect(Boolean(def.risk)).toBe(Boolean(def.penalty));
      if (def.risk) {
        expect(def.penalty).toBeDefined();
      }
    }
    expect(UPGRADES_BY_ID.overclock.penalty).toEqual({
      kind: 'moveSpeedPct',
      value: -0.06,
    });
    expect(UPGRADES_BY_ID.glassCannon.penalty).toEqual({
      kind: 'damageTakenPct',
      value: 0.15,
    });
    expect(UPGRADES_BY_ID.shortCircuit.penalty).toEqual({
      kind: 'rangePct',
      value: -0.12,
    });
  });

  it('keeps upgrade ids and map keys consistent', () => {
    expectIdsMatch(UPGRADE_LIST, UPGRADES_BY_ID);
  });
});

describe('modules', () => {
  it('matches the documented prices', () => {
    expect(Object.fromEntries(MODULE_LIST.map((module) => [module.id, module.price]))).toEqual({
      coolingFan: 18,
      hollowPoint: 20,
      servoBearing: 16,
      compositeArmor: 18,
      emergencyBattery: 16,
      repairArm: 20,
      magneticChassis: 12,
      tacticalLens: 18,
      coinAmplifier: 15,
      spareMagazine: 26,
    });
  });

  it('caps every module at 3 stacks', () => {
    for (const module of MODULE_LIST) {
      expect(module.maxStacks).toBe(3);
      expect(module.maxStacks).toBe(BALANCE.moduleMaxStacks);
    }
  });

  it('maps module effects and heals on emergency battery', () => {
    expect(MODULES_BY_ID.emergencyBattery.effect).toEqual({
      kind: 'maxHp',
      value: 20,
      heal: 20,
    });
    expect(MODULES_BY_ID.spareMagazine.effect).toEqual({ kind: 'cooldownMul', value: 0.96 });
    expect(MODULES_BY_ID.magneticChassis.effect).toEqual({ kind: 'pickupRadius', value: 35 });
  });

  it('keeps module ids and map keys consistent', () => {
    expectIdsMatch(MODULE_LIST, MODULES_BY_ID);
  });
});

describe('enemies', () => {
  it('matches the documented boss stats', () => {
    expect(ENEMIES_BY_ID.forgeCore).toMatchObject({
      name: '熔炉核心',
      behavior: 'boss',
      hp: 2200,
      speed: 55,
      contactDamage: 22,
      coin: 60,
      radius: 42,
      spawnCost: 0,
      elite: false,
      boss: true,
    });
  });

  it('keeps the elite and baseline stats distinct', () => {
    expect(ENEMIES_BY_ID.overseer).toMatchObject({
      hp: 350,
      speed: 65,
      contactDamage: 15,
      coin: 20,
      radius: 24,
      spawnCost: 8,
      elite: true,
      boss: false,
    });
    expect(ENEMIES_BY_ID.biter).toMatchObject({
      hp: 16,
      speed: 95,
      contactDamage: 6,
      coin: 1,
      spawnCost: 1,
    });
    expect(ENEMIES_BY_ID.drone).toMatchObject({ hp: 10, speed: 145, coin: 1, spawnCost: 1 });
    expect(ENEMIES_BY_ID.charger).toMatchObject({ hp: 60, speed: 55, coin: 3, spawnCost: 3 });
    expect(ENEMIES_BY_ID.spitter).toMatchObject({ hp: 32, speed: 75, coin: 3, spawnCost: 3 });
    expect(ENEMY_LIST.filter((enemy) => enemy.boss)).toHaveLength(1);
  });

  it('keeps enemy ids and map keys consistent', () => {
    expectIdsMatch(ENEMY_LIST, ENEMIES_BY_ID);
  });
});

describe('waves', () => {
  it('matches the documented durations and rewards', () => {
    expect(WAVE_LIST.map((wave) => wave.duration)).toEqual([25, 30, 30, 35, 35, 40, 40, null]);
    expect(WAVE_LIST.map((wave) => wave.reward)).toEqual([10, 12, 14, 16, 18, 20, 22, 0]);
    expect(WAVE_LIST.map((wave) => wave.wave)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('controls infinite spawn pressure with a per-wave interval', () => {
    const intervals = [1.4, 1.2, 1.05, 0.8, 0.7, 0.6, 0.5];

    for (let index = 0; index < 7; index += 1) {
      const wave = WAVE_LIST[index];
      const interval = intervals[index];
      expect(wave).toBeDefined();
      expect(interval).toBeDefined();
      if (!wave || interval === undefined) continue;
      expect(wave.spawnInterval).toBe(interval);
      expect(wave.spawnInterval).toBeGreaterThan(0);
      const totalWeight = Object.values(wave.spawnWeights).reduce(
        (total, weight) => total + (weight ?? 0),
        0,
      );
      expect(totalWeight).toBe(100);
    }

    for (let index = 1; index < 7; index += 1) {
      const previous = WAVE_LIST[index - 1];
      const current = WAVE_LIST[index];
      if (!previous || !current) continue;
      expect(current.spawnInterval).toBeLessThan(previous.spawnInterval);
    }

    const boss = WAVE_LIST[7];
    expect(boss?.spawnInterval).toBe(0);
    expect(boss?.spawnWeights).toEqual({});
    expect(boss?.duration).toBeNull();
  });

  it('schedules elites on waves 4, 6 and 7', () => {
    expect(WAVE_LIST.map((wave) => wave.eliteAtPct)).toEqual([
      [],
      [],
      [],
      [0.35],
      [],
      [0.3],
      [0.3, 0.65],
      [],
    ]);
  });

  it('marks only wave 8 as the boss wave', () => {
    expect(WAVE_LIST.filter((wave) => wave.boss).map((wave) => wave.wave)).toEqual([8]);
  });

  it('keeps wave ids and map keys consistent', () => {
    expect(Object.keys(WAVES_BY_ID)).toHaveLength(WAVE_LIST.length);
    for (const wave of WAVE_LIST) {
      expect(WAVES_BY_ID[wave.wave]).toBe(wave);
    }
  });
});
