import type { WeaponDef, WeaponId } from '../types';

const pulseNailer: WeaponDef = {
  id: 'pulseNailer',
  name: '脉冲钉枪',
  role: '均衡单体',
  description: '单发直射的可靠起手武器，弹速 900，适合稳定清理直线上的目标。',
  behavior: 'projectile',
  baseDamage: 7,
  cooldown: 0.55,
  range: 520,
  price: 28,
  projectileSpeed: 900,
  projectileRadius: 3,
  pelletCount: 1,
  spreadDeg: 0,
  pierce: 0,
  knockback: 0,
  icon: '⊹',
  color: '#F5A524',
};

const scatterRivets: WeaponDef = {
  id: 'scatterRivets',
  name: '散射铆钉',
  role: '近距爆发',
  description: '一次打出 5 发铆钉，40° 扇形覆盖近距离，贴脸时总伤害极高。',
  behavior: 'shotgun',
  baseDamage: 2.6,
  cooldown: 1.1,
  range: 300,
  price: 30,
  projectileSpeed: 780,
  projectileRadius: 3,
  pelletCount: 5,
  spreadDeg: 40,
  pierce: 0,
  knockback: 0,
  icon: '⁂',
  color: '#67E8C7',
};

const arcHammer: WeaponDef = {
  id: 'arcHammer',
  name: '电弧锤',
  role: '近战控场',
  description: '挥出 120° 电弧重击，击退 160，用于清理贴身的虫群并拉开距离。',
  behavior: 'melee',
  baseDamage: 16,
  cooldown: 0.9,
  range: 85,
  price: 34,
  projectileSpeed: 0,
  projectileRadius: 0,
  pelletCount: 1,
  spreadDeg: 120,
  pierce: 0,
  knockback: 160,
  icon: '⌁',
  color: '#5B8CFF',
};

const returnGear: WeaponDef = {
  id: 'returnGear',
  name: '回旋齿轮',
  role: '穿透回旋',
  description: '飞行到射程终点后返回，去程穿透 3 个目标，返回阶段伤害为 50%。',
  behavior: 'boomerang',
  baseDamage: 8,
  cooldown: 1.5,
  range: 700,
  price: 32,
  projectileSpeed: 620,
  projectileRadius: 7,
  pelletCount: 1,
  spreadDeg: 0,
  pierce: 3,
  knockback: 0,
  icon: '✳',
  color: '#D98B3A',
};

const railSpike: WeaponDef = {
  id: 'railSpike',
  name: '磁轨长钉',
  role: '远程重击',
  description: '高速长钉穿透 2 个目标，弹速 1200，命中时迸出小范围火花。',
  behavior: 'rail',
  baseDamage: 14,
  cooldown: 1.6,
  range: 760,
  price: 36,
  projectileSpeed: 1200,
  projectileRadius: 4,
  pelletCount: 1,
  spreadDeg: 0,
  pierce: 2,
  knockback: 0,
  icon: '⟶',
  color: '#4C6FFF',
};

export const WEAPON_LIST: readonly WeaponDef[] = [
  pulseNailer,
  scatterRivets,
  arcHammer,
  returnGear,
  railSpike,
];

export const WEAPONS_BY_ID: Record<WeaponId, WeaponDef> = {
  pulseNailer,
  scatterRivets,
  arcHammer,
  returnGear,
  railSpike,
};

export const WEAPON_PRICE: Record<WeaponId, number> = {
  pulseNailer: pulseNailer.price,
  scatterRivets: scatterRivets.price,
  arcHammer: arcHammer.price,
  returnGear: returnGear.price,
  railSpike: railSpike.price,
};
