import type { EnemyDef, EnemyId } from '../types';

const biter: EnemyDef = {
  id: 'biter',
  name: '啃咬虫',
  role: '基础填充怪',
  behavior: 'chaser',
  hp: 16,
  speed: 95,
  contactDamage: 5,
  coin: 1,
  radius: 10,
  spawnCost: 1,
  elite: false,
  boss: false,
  color: '#F28C3B',
  accent: '#FFC65C',
};

const drone: EnemyDef = {
  id: 'drone',
  name: '蜂群无人机',
  role: '高速骚扰',
  behavior: 'weaver',
  hp: 10,
  speed: 145,
  contactDamage: 3,
  coin: 1,
  radius: 8,
  spawnCost: 1,
  elite: false,
  boss: false,
  color: '#67E8C7',
  accent: '#B8F5E6',
};

const charger: EnemyDef = {
  id: 'charger',
  name: '冲撞机',
  role: '蓄力冲撞',
  behavior: 'charger',
  hp: 60,
  speed: 55,
  contactDamage: 12,
  coin: 3,
  radius: 14,
  spawnCost: 3,
  elite: false,
  boss: false,
  color: '#FF5C5C',
  accent: '#FFA0A0',
};

const spitter: EnemyDef = {
  id: 'spitter',
  name: '喷吐炮',
  role: '远程压制',
  behavior: 'spitter',
  hp: 32,
  speed: 75,
  contactDamage: 4,
  coin: 3,
  radius: 12,
  spawnCost: 3,
  elite: false,
  boss: false,
  color: '#5B8CFF',
  accent: '#A9C0FF',
};

const overseer: EnemyDef = {
  id: 'overseer',
  name: '监工精英',
  role: '近战 + 弹幕精英',
  behavior: 'overseer',
  hp: 350,
  speed: 65,
  contactDamage: 15,
  coin: 20,
  radius: 24,
  spawnCost: 8,
  elite: true,
  boss: false,
  color: '#E0447A',
  accent: '#F5A524',
};

const forgeCore: EnemyDef = {
  id: 'forgeCore',
  name: '熔炉核心',
  role: 'Boss',
  behavior: 'boss',
  hp: 2200,
  speed: 55,
  contactDamage: 18,
  coin: 60,
  radius: 42,
  spawnCost: 0,
  elite: false,
  boss: true,
  color: '#C2410C',
  accent: '#FFB020',
};

export const ENEMY_LIST: readonly EnemyDef[] = [
  biter,
  drone,
  charger,
  spitter,
  overseer,
  forgeCore,
];

export const ENEMIES_BY_ID: Record<EnemyId, EnemyDef> = {
  biter,
  drone,
  charger,
  spitter,
  overseer,
  forgeCore,
};
