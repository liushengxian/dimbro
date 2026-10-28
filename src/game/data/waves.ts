import type { WaveDef } from '../types';

/**
 * 8 波编排。前 7 波在开战时按 targetUnits / targetHp 预生成刷怪队列；
 * 精英按 eliteAtPct（波次时长百分比）单独出现，不占用杂兵队列。
 * spawnWeights 使用整数权重，只表示类型偏好，不再直接消耗费用预算。
 */
const wave1: WaveDef = {
  wave: 1,
  duration: 25,
  reward: 10,
  label: '初次接触',
  hint: '教学式低压：只有啃咬虫，先熟悉走位与自动开火。',
  targetUnits: 18,
  targetHp: 233,
  spawnWeights: { biter: 100 },
  eliteAtPct: [],
  boss: false,
};

const wave2: WaveDef = {
  wave: 2,
  duration: 30,
  reward: 12,
  label: '密度提升',
  hint: '蜂群无人机加入，保持移动，别被包夹。',
  targetUnits: 26,
  targetHp: 317,
  spawnWeights: { biter: 60, drone: 40 },
  eliteAtPct: [],
  boss: false,
};

const wave3: WaveDef = {
  wave: 3,
  duration: 30,
  reward: 14,
  label: '首次冲撞',
  hint: '冲撞机登场，留意 0.5 秒蓄力预警后的直线冲锋。',
  targetUnits: 26,
  targetHp: 541,
  spawnWeights: { biter: 50, drone: 30, charger: 20 },
  eliteAtPct: [],
  boss: false,
};

const wave4: WaveDef = {
  wave: 4,
  duration: 35,
  reward: 16,
  label: '监工巡视',
  hint: '全基础怪 + 喷吐炮；约第 12 秒出现 1 只监工精英。',
  targetUnits: 21,
  targetHp: 988,
  spawnWeights: { biter: 40, drone: 25, charger: 20, spitter: 15 },
  eliteAtPct: [0.35],
  boss: false,
};

const wave5: WaveDef = {
  wave: 5,
  duration: 35,
  reward: 18,
  label: '高压混合',
  hint: '四类基础敌人同时施压，优先清理远程喷吐炮。',
  targetUnits: 31,
  targetHp: 1092,
  spawnWeights: { biter: 35, drone: 25, charger: 20, spitter: 20 },
  eliteAtPct: [],
  boss: false,
};

const wave6: WaveDef = {
  wave: 6,
  duration: 40,
  reward: 20,
  label: '监工压境',
  hint: '第 12 秒出现 1 只监工精英，留好输出窗口。',
  targetUnits: 23,
  targetHp: 1404,
  spawnWeights: { biter: 30, drone: 25, charger: 22, spitter: 23 },
  eliteAtPct: [0.3],
  boss: false,
};

const wave7: WaveDef = {
  wave: 7,
  duration: 40,
  reward: 22,
  label: '双监工',
  hint: '第 12、26 秒各出现 1 只监工精英；高密度基础怪掩护，撑过这一波就能见到熔炉核心。',
  targetUnits: 26,
  targetHp: 1872,
  spawnWeights: { biter: 28, drone: 24, charger: 24, spitter: 24 },
  eliteAtPct: [0.3, 0.65],
  boss: false,
};

const wave8: WaveDef = {
  wave: 8,
  duration: null,
  reward: 0,
  label: '熔炉核心',
  hint: 'Boss 战无硬时限；50% 血量进入二阶段，60 秒后软狂暴。',
  targetUnits: 0,
  targetHp: 0,
  spawnWeights: {},
  eliteAtPct: [],
  boss: true,
};

export const WAVE_LIST: readonly WaveDef[] = [
  wave1,
  wave2,
  wave3,
  wave4,
  wave5,
  wave6,
  wave7,
  wave8,
];

export const WAVES_BY_ID: Record<number, WaveDef> = {
  1: wave1,
  2: wave2,
  3: wave3,
  4: wave4,
  5: wave5,
  6: wave6,
  7: wave7,
  8: wave8,
};
