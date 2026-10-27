import type { ModuleDef, ModuleId } from '../types';

const coolingFan: ModuleDef = {
  id: 'coolingFan',
  name: '冷却风扇',
  description: '攻击速度 +10%。',
  price: 18,
  maxStacks: 3,
  icon: '❄',
  effect: { kind: 'attackSpeedPct', value: 0.1 },
};

const hollowPoint: ModuleDef = {
  id: 'hollowPoint',
  name: '强化弹头',
  description: '伤害 +12%。',
  price: 20,
  maxStacks: 3,
  icon: '◈',
  effect: { kind: 'damagePct', value: 0.12 },
};

const servoBearing: ModuleDef = {
  id: 'servoBearing',
  name: '伺服轴承',
  description: '移动速度 +8%。',
  price: 16,
  maxStacks: 3,
  icon: '⚙',
  effect: { kind: 'moveSpeedPct', value: 0.08 },
};

const compositeArmor: ModuleDef = {
  id: 'compositeArmor',
  name: '复合装甲',
  description: '护甲 +2。',
  price: 18,
  maxStacks: 3,
  icon: '▣',
  effect: { kind: 'armor', value: 2 },
};

const emergencyBattery: ModuleDef = {
  id: 'emergencyBattery',
  name: '应急电池',
  description: '最大生命 +20，并立即回复 20 点生命。',
  price: 16,
  maxStacks: 3,
  icon: '▰',
  effect: { kind: 'maxHp', value: 20, heal: 20 },
};

const repairArm: ModuleDef = {
  id: 'repairArm',
  name: '维修机械臂',
  description: '生命回复 +0.5/s。',
  price: 20,
  maxStacks: 3,
  icon: '✚',
  effect: { kind: 'regen', value: 0.5 },
};

const magneticChassis: ModuleDef = {
  id: 'magneticChassis',
  name: '磁吸底盘',
  description: '拾取半径 +35。',
  price: 12,
  maxStacks: 3,
  icon: '◎',
  effect: { kind: 'pickupRadius', value: 35 },
};

const tacticalLens: ModuleDef = {
  id: 'tacticalLens',
  name: '战术目镜',
  description: '暴击率 +4%。',
  price: 18,
  maxStacks: 3,
  icon: '◉',
  effect: { kind: 'critChance', value: 0.04 },
};

const coinAmplifier: ModuleDef = {
  id: 'coinAmplifier',
  name: '金币增幅器',
  description: '金币获取 +15%。',
  price: 15,
  maxStacks: 3,
  icon: '◈',
  effect: { kind: 'coinPct', value: 0.15 },
};

const spareMagazine: ModuleDef = {
  id: 'spareMagazine',
  name: '备用弹仓',
  description: '所有武器冷却 -4%。',
  price: 26,
  maxStacks: 3,
  icon: '▤',
  effect: { kind: 'cooldownMul', value: 0.96 },
};

export const MODULE_LIST: readonly ModuleDef[] = [
  coolingFan,
  hollowPoint,
  servoBearing,
  compositeArmor,
  emergencyBattery,
  repairArm,
  magneticChassis,
  tacticalLens,
  coinAmplifier,
  spareMagazine,
];

export const MODULES_BY_ID: Record<ModuleId, ModuleDef> = {
  coolingFan,
  hollowPoint,
  servoBearing,
  compositeArmor,
  emergencyBattery,
  repairArm,
  magneticChassis,
  tacticalLens,
  coinAmplifier,
  spareMagazine,
};
