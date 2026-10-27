import type { CharacterDef, CharacterId } from '../types';

const sunsetNeedle: CharacterDef = {
  id: 'sunsetNeedle',
  name: '夕阳针',
  callsign: 'SUNSET NEEDLE',
  role: '高攻速爆发',
  tagline: '先别重启，让我看看日志。',
  description:
    '靠 RESET 把攻速瞬间拉满的爆发型程序员。她保持移动叠起光轨追焦，再用高频命中不断寻找下一次倒带窗口。',
  hint: '保持移动，优先堆攻速与暴击；RESET 亮起时贴近敌群，用击杀把 4 秒爆发续到 6 秒。',
  enabled: true,
  difficulty: 3,
  startingWeaponId: 'pulseNailer',
  base: {
    maxHp: 80,
    armor: 0,
    moveSpeed: 235,
    damagePct: -0.05,
    attackSpeedPct: 0.2,
    critChance: 0.08,
  },
  passives: [
    {
      id: 'reset',
      name: 'RESET',
      summary: '2% 触发 4 秒爆发：攻速 ×5、伤害 +15%，击杀可延长至 6 秒。',
      description:
        '每把武器每次攻击命中至少一个敌人后独立判定 2%，同一次攻击命中多个目标也只算一次。触发后持续 4 秒：攻速 ×5、伤害 +15%；期间每次击杀延长 0.1 秒，最长 6 秒。激活期间不再判定，波次结束强制清除。',
    },
    {
      id: 'lightTrail',
      name: '光轨追焦',
      summary: '连续移动 1 秒：移速 +10%、暴击率 +8%。',
      description:
        '连续产生移动输入满 1 秒后进入光轨追焦：移速 +10%，暴击率 +8 个百分点，暴击率仍受 75% 上限限制。停下后 1 秒内再次移动可保持状态，连续静止满 1 秒退出；与 RESET 可同时生效。',
    },
  ],
  palette: {
    primary: '#FF5C3A',
    secondary: '#4C6FFF',
    glow: '#F5A524',
    suit: '#2B2F3A',
    visor: '#FF8A3D',
    metal: '#8C93A8',
  },
  appearanceNotes: ['橙红护目镜', '针形发卡', '补丁夹克', '故障扫描线'],
};

const simon: CharacterDef = {
  id: 'simon',
  name: 'Simon',
  callsign: 'SIMON',
  role: '高伤 / 经济',
  tagline: '别慌，我带了工具，也带了备件。',
  description:
    '常驻高伤的维修工程师。他靠溢伤弹射滚起击杀，又在波次结束时把漏捡金币全部收回，换成下一波的维修护盾。',
  hint: '优先购买高伤武器与金币增幅；让弹射收尾残血小怪，波末用漏捡金币补满护盾。',
  enabled: true,
  difficulty: 1,
  startingWeaponId: 'scatterRivets',
  base: {
    maxHp: 100,
    armor: 1,
    moveSpeed: 220,
    damagePct: 0,
    attackSpeedPct: 0,
    critChance: 0.05,
  },
  passives: [
    {
      id: 'simonTooStrong',
      name: 'Simon太强了',
      summary: '伤害 +20%；击杀时 25% 溢出伤害弹射 160px 内最近敌人，不连锁。',
      description:
        '常驻伤害 +20%，与其他伤害加成线性相加。直接伤害击杀敌人时，超出目标剩余生命的 25% 伤害会弹射给 160px 内最近的另一名敌人；每次击杀最多弹射 1 次，弹射不会再次触发弹射，可正常击杀并掉落金币。',
    },
    {
      id: 'simonWillFixIt',
      name: 'Simon今天会修的',
      summary: '波次结束自动收走全部漏捡金币；每 15 枚换 1 层维修护盾，最多 2 层。',
      description:
        '波次结束时自动拾取场上全部未拾取金币，金币照常进入钱包。每回收 15 枚获得 1 层维修护盾，最多持有 2 层并跨波保留；护盾优先抵挡一次完整伤害，破碎后获得 0.3 秒无敌。',
    },
  ],
  palette: {
    primary: '#67E8C7',
    secondary: '#F5A524',
    glow: '#9AF5DD',
    suit: '#2F6F63',
    visor: '#D9FFF5',
    metal: '#A7B4B0',
  },
  appearanceNotes: ['薄荷青维修工装', '工具腰带', '线缆背包', '贴胶带终端'],
};

/**
 * Demo 中保持禁用。数值、初始武器与难度均为占位，不进入可选列表。
 */
const junyi: CharacterDef = {
  id: 'junyi',
  name: 'Junyi',
  callsign: 'JUNYI',
  role: '能力设计中',
  tagline: '该角色尚未完成，暂时禁用。',
  description: '第三位 DimAgent 程序员的能力、初始武器与外观仍在设计中，本 Demo 只保留角色数据。',
  hint: '点击只会看到禁用提示，不会改变当前选择。',
  enabled: false,
  difficulty: 1,
  startingWeaponId: 'pulseNailer',
  base: {
    maxHp: 0,
    armor: 0,
    moveSpeed: 0,
    damagePct: 0,
    attackSpeedPct: 0,
    critChance: 0,
  },
  passives: [
    {
      id: 'undecided',
      name: '未定',
      summary: '角色暂未完成，Demo 中禁用。',
      description: 'Junyi 的被动尚未设计。他不会出现在可选角色列表中，也不参与平衡与验收。',
    },
  ],
  palette: {
    primary: '#8A8F98',
    secondary: '#5C626D',
    glow: '#B8BCC4',
    suit: '#4A4F58',
    visor: '#6B7280',
    metal: '#9CA3AF',
  },
  appearanceNotes: ['灰色剪影', '问号工牌'],
};

export const CHARACTER_LIST: readonly CharacterDef[] = [sunsetNeedle, simon, junyi];

export const CHARACTERS_BY_ID: Record<CharacterId, CharacterDef> = {
  sunsetNeedle,
  simon,
  junyi,
};

export const PLAYABLE_CHARACTERS: readonly CharacterDef[] = CHARACTER_LIST.filter(
  (character) => character.enabled,
);
