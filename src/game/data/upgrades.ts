import type { UpgradeDef, UpgradeId } from '../types';

const dmg: UpgradeDef = {
  id: 'dmg',
  name: '校准枪管',
  description: '所有伤害 +10%。',
  maxStacks: 6,
  icon: '⌖',
  effect: { kind: 'damagePct', value: 0.1 },
};

const atk: UpgradeDef = {
  id: 'atk',
  name: '高速马达',
  description: '攻击速度 +8%。',
  maxStacks: 6,
  icon: '⟳',
  effect: { kind: 'attackSpeedPct', value: 0.08 },
};

const move: UpgradeDef = {
  id: 'move',
  name: '轻量骨架',
  description: '移动速度 +7%。',
  maxStacks: 5,
  icon: '⤢',
  effect: { kind: 'moveSpeedPct', value: 0.07 },
};

const armor: UpgradeDef = {
  id: 'armor',
  name: '加厚装甲',
  description: '护甲 +2。',
  maxStacks: 5,
  icon: '▣',
  effect: { kind: 'armor', value: 2 },
};

const hp: UpgradeDef = {
  id: 'hp',
  name: '扩容电池',
  description: '最大生命 +15，并立即回复 15 点生命。',
  maxStacks: 5,
  icon: '✚',
  effect: { kind: 'maxHp', value: 15, heal: 15 },
};

const regen: UpgradeDef = {
  id: 'regen',
  name: '自修程序',
  description: '每秒生命回复 +0.6。',
  maxStacks: 4,
  icon: '♻',
  effect: { kind: 'regen', value: 0.6 },
};

const crit: UpgradeDef = {
  id: 'crit',
  name: '暴击校准',
  description: '暴击率 +4%。',
  maxStacks: 6,
  icon: '✦',
  effect: { kind: 'critChance', value: 0.04 },
};

const critdmg: UpgradeDef = {
  id: 'critdmg',
  name: '精准瞄具',
  description: '暴击伤害 +20%。',
  maxStacks: 4,
  icon: '◎',
  effect: { kind: 'critDamagePct', value: 0.2 },
};

const pickup: UpgradeDef = {
  id: 'pickup',
  name: '磁力线圈',
  description: '拾取半径 +30。',
  maxStacks: 4,
  icon: '◉',
  effect: { kind: 'pickupRadius', value: 30 },
};

const range: UpgradeDef = {
  id: 'range',
  name: '射程扩展',
  description: '武器射程 +8%。',
  maxStacks: 3,
  icon: '↔',
  effect: { kind: 'rangePct', value: 0.08 },
};

const coin: UpgradeDef = {
  id: 'coin',
  name: '拾荒协议',
  description: '金币获取 +15%。',
  maxStacks: 3,
  icon: '◈',
  effect: { kind: 'coinPct', value: 0.15 },
};

const knockback: UpgradeDef = {
  id: 'knockback',
  name: '冲击组件',
  description: '击退距离 +25%。',
  maxStacks: 3,
  icon: '⇥',
  effect: { kind: 'knockbackPct', value: 0.25 },
};

export const UPGRADE_LIST: readonly UpgradeDef[] = [
  dmg,
  atk,
  move,
  armor,
  hp,
  regen,
  crit,
  critdmg,
  pickup,
  range,
  coin,
  knockback,
];

export const UPGRADES_BY_ID: Record<UpgradeId, UpgradeDef> = {
  dmg,
  atk,
  move,
  armor,
  hp,
  regen,
  crit,
  critdmg,
  pickup,
  range,
  coin,
  knockback,
};
