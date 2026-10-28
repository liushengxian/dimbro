/**
 * 属性汇总、开局构造与武器伤害 / 冷却公式。
 *
 * 所有规则数值来自 v0.4 设计文档与 data/BALANCE；本模块是纯函数，
 * 不读写 localStorage，也不依赖战斗实体。
 */

import { BALANCE } from '../data/balance';
import { CHARACTERS_BY_ID } from '../data/characters';
import { MODULES_BY_ID } from '../data/modules';
import { UPGRADES_BY_ID } from '../data/upgrades';
import { WEAPONS_BY_ID } from '../data/weapons';
import type {
  ModuleId,
  PlayableCharacterId,
  PlayerStats,
  RunState,
  StatEffect,
  UpgradeId,
  WeaponDef,
  WeaponId,
} from '../types';

export interface RuntimeModifiers {
  damagePct?: number;
  attackSpeedPct?: number;
  moveSpeedPct?: number;
  critChance?: number;
  attackSpeedMultiplier?: number;
  cooldownMultiplier?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function characterDef(characterId: PlayableCharacterId) {
  const def = CHARACTERS_BY_ID[characterId];
  if (def === undefined) {
    throw new Error(`Unknown character: ${characterId}`);
  }
  return def;
}

function weaponDef(id: WeaponId): WeaponDef {
  const def = WEAPONS_BY_ID[id];
  if (def === undefined) {
    throw new Error(`Unknown weapon: ${id}`);
  }
  return def;
}

function applyEffect(stats: PlayerStats, effect: StatEffect, stacks: number): void {
  if (stacks <= 0) return;
  const amount = effect.value * stacks;

  switch (effect.kind) {
    case 'maxHp':
      stats.maxHp += amount;
      break;
    case 'armor':
      stats.armor += amount;
      break;
    case 'damagePct':
      stats.damagePct += amount;
      break;
    case 'attackSpeedPct':
      stats.attackSpeedPct += amount;
      break;
    case 'moveSpeedPct':
      stats.moveSpeedPct += amount;
      break;
    case 'critChance':
      stats.critChance += amount;
      break;
    case 'critDamagePct':
      stats.critDamagePct += amount;
      break;
    case 'pickupRadius':
      stats.pickupRadius += amount;
      break;
    case 'regen':
      stats.regen += amount;
      break;
    case 'rangePct':
      stats.rangePct += amount;
      break;
    case 'coinPct':
      stats.coinPct += amount;
      break;
    case 'knockbackPct':
      stats.knockbackPct += amount;
      break;
    case 'damageTakenPct':
      stats.damageTakenPct += amount;
      break;
    case 'cooldownMul':
      // 备用弹仓：每层 0.96，多层相乘。
      stats.cooldownMul *= Math.pow(effect.value, stacks);
      break;
  }
}

function applyUpgrades(stats: PlayerStats, run: RunState): void {
  for (const [id, stacks] of Object.entries(run.upgrades)) {
    if (stacks === undefined || stacks <= 0) continue;
    const def = UPGRADES_BY_ID[id as UpgradeId];
    if (def === undefined) continue;
    applyEffect(stats, def.effect, stacks);
    if (def.penalty !== undefined) applyEffect(stats, def.penalty, stacks);
  }
}

function applyModules(stats: PlayerStats, run: RunState): void {
  for (const [id, count] of Object.entries(run.modules)) {
    if (count === undefined || count <= 0) continue;
    const def = MODULES_BY_ID[id as ModuleId];
    if (def === undefined) continue;
    applyEffect(stats, def.effect, count);
  }
}

/** 角色的裸基础属性：不含升级、模块、被动常驻与运行时 Buff。 */
export function baseStats(characterId: PlayableCharacterId): PlayerStats {
  const def = characterDef(characterId);
  return {
    maxHp: def.base.maxHp,
    armor: def.base.armor,
    damagePct: def.base.damagePct,
    attackSpeedPct: def.base.attackSpeedPct,
    moveSpeed: def.base.moveSpeed,
    moveSpeedPct: 0,
    critChance: def.base.critChance,
    critDamagePct: BALANCE.playerBase.critDamagePct,
    pickupRadius: BALANCE.playerBase.pickupRadius,
    rangePct: BALANCE.playerBase.rangePct,
    coinPct: BALANCE.playerBase.coinPct,
    knockbackPct: BALANCE.playerBase.knockbackPct,
    regen: BALANCE.playerBase.regen,
    damageTakenPct: 0,
    cooldownMul: BALANCE.playerBase.cooldownMul,
  };
}

/**
 * 角色基础 + 升级 + 模块 + 角色常驻被动 + 运行时派生修正。
 *
 * 攻速加成与暴击率在最后统一截断；RESET 的 ×5 攻速属于临时倍率，
 * 只由 weaponCooldown(resetActive=true) 处理，不写入 attackSpeedPct。
 */
export function computePlayerStats(run: RunState, mods: RuntimeModifiers = {}): PlayerStats {
  const stats = baseStats(run.characterId);

  applyUpgrades(stats, run);
  applyModules(stats, run);

  if (run.characterId === 'simon') {
    stats.damagePct += BALANCE.simonDamageBonus;
  }

  stats.damagePct += mods.damagePct ?? 0;
  stats.attackSpeedPct += mods.attackSpeedPct ?? 0;
  stats.moveSpeedPct += mods.moveSpeedPct ?? 0;
  stats.critChance += mods.critChance ?? 0;

  if (mods.cooldownMultiplier !== undefined) {
    stats.cooldownMul *= mods.cooldownMultiplier;
  }

  stats.attackSpeedPct = Math.min(stats.attackSpeedPct, BALANCE.attackSpeedCap);
  stats.critChance = Math.min(stats.critChance, BALANCE.critCap);

  return stats;
}

/** 新开一局：第 1 波、初始金币、满血、仅持初始武器 Lv.1。 */
export function createRun(characterId: PlayableCharacterId, seed: number): RunState {
  const def = characterDef(characterId);
  if (!def.enabled) {
    throw new Error(`Character is not playable: ${characterId}`);
  }

  const startingWeapon = weaponDef(def.startingWeaponId);

  const run: RunState = {
    seed,
    characterId,
    wave: 1,
    coins: BALANCE.startingCoins,
    coinRemainder: 0,
    currentHp: 1,
    shields: 0,
    upgrades: {},
    modules: {},
    weapons: [{ id: startingWeapon.id, level: 1, paid: startingWeapon.price }],
    totals: {
      kills: 0,
      damage: 0,
      bestHit: 0,
      elapsedSeconds: 0,
      coinsEarned: 0,
    },
  };

  run.currentHp = computePlayerStats(run).maxHp;
  return run;
}

function normalizeWeaponLevel(level: number): number {
  const floored = Number.isFinite(level) ? Math.floor(level) : 1;
  return clamp(floored, 1, BALANCE.maxWeaponLevel);
}

/**
 * 单次武器命中伤害（浮点）。暴击倍率为 1.5 + 暴击伤害加成。
 * 不回乘敌人承伤系数，最低 1 点。
 */
export function weaponDamage(
  def: WeaponDef,
  level: number,
  stats: PlayerStats,
  isCrit: boolean,
): number {
  const lvl = normalizeWeaponLevel(level);
  const levelFactor = Math.pow(BALANCE.weaponLevelDamage, lvl - 1);
  const critFactor = isCrit ? BALANCE.critBaseMultiplier + stats.critDamagePct : 1;
  const damage = def.baseDamage * levelFactor * (1 + stats.damagePct) * critFactor;
  return Math.max(BALANCE.minDamage, damage);
}

/**
 * 实际武器冷却（秒）。先按常规攻速截断到 0.12s，RESET 时再除以 5，
 * 最终下限 0.08s。RESET 倍率作用在常规冷却之后，不受 150% 攻速上限影响。
 */
export function weaponCooldown(
  def: WeaponDef,
  level: number,
  stats: PlayerStats,
  resetActive: boolean,
): number {
  const lvl = normalizeWeaponLevel(level);
  const levelFactor = Math.pow(BALANCE.weaponLevelCooldown, lvl - 1);
  const attackSpeed = clamp(stats.attackSpeedPct, -0.99, BALANCE.attackSpeedCap);
  const denominator = Math.max(0.01, 1 + attackSpeed);

  let cooldown = (def.cooldown * levelFactor * stats.cooldownMul) / denominator;
  cooldown = Math.max(cooldown, BALANCE.minCooldown);

  if (resetActive) {
    cooldown = Math.max(cooldown / BALANCE.resetSpeedMultiplier, BALANCE.resetMinCooldown);
  }

  return cooldown;
}

/** 护甲递减减伤：raw × 30 / (30 + armor)，最低 1 点。 */
export function mitigateArmor(rawDamage: number, armor: number): number {
  const safeArmor = Number.isFinite(armor) ? Math.max(0, armor) : 0;
  const mitigated = (rawDamage * BALANCE.armorK) / (BALANCE.armorK + safeArmor);
  return Math.max(BALANCE.minDamage, mitigated);
}

/**
 * 结算一次金币掉落。保留小数余量，避免 +15% / +30% 在 1 金币掉落上
 * 被 Math.round 吃掉；长期期望值仍然正确。
 */
export function awardCoins(run: RunState, baseValue: number, coinPct: number): number {
  const raw = baseValue * (1 + coinPct) + run.coinRemainder;
  const awarded = Math.max(1, Math.floor(raw));
  run.coinRemainder = Math.max(0, raw - awarded);
  return awarded;
}

/**
 * 上限提升后同步当前生命，但不会回满。
 * 调用方应先写入 upgrades / modules，再调用本函数。
 */
export function applyMaxHpBonus(run: RunState, amount: number): void {
  const newMaxHp = computePlayerStats(run).maxHp;
  run.currentHp = Math.min(run.currentHp + amount, newMaxHp);
}
