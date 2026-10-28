/**
 * 《dimbro》v0.4 数值基线。
 * 所有系统共享的常量集中在这里，系统代码不应再硬编码这些数字。
 */
export const BALANCE = {
  worldWidth: 1600,
  worldHeight: 900,
  margin: 24,
  /** Boss 从上方门口登场，避免与站在场地中央的玩家重叠。 */
  bossSpawnY: 170,

  startingCoins: 15,
  waveCount: 8,

  enemyCap: 60,
  enemyResumeThreshold: 48,
  maxPickups: 100,
  maxPlayerProjectiles: 120,
  maxEnemyProjectiles: 80,

  playerRadius: 14,
  playerIframes: 0.6,
  playerBase: {
    maxHp: 100,
    armor: 0,
    moveSpeed: 220,
    damagePct: 0,
    attackSpeedPct: 0,
    critChance: 0.05,
    critDamagePct: 0.5,
    pickupRadius: 80,
    regen: 0,
    rangePct: 0,
    coinPct: 0,
    knockbackPct: 0,
    cooldownMul: 1,
  },

  critCap: 0.75,
  critBaseMultiplier: 1.5,
  attackSpeedCap: 1.5,
  minCooldown: 0.12,
  minDamage: 1,
  armorK: 30,

  resetMinCooldown: 0.08,
  resetChance: 0.02,
  resetDuration: 4,
  resetMaxDuration: 6,
  resetKillExtension: 0.1,
  resetSpeedMultiplier: 5,
  resetDamageBonus: 0.15,

  lightTrailMoveHold: 1,
  lightTrailIdleGrace: 1,
  lightTrailMoveSpeedPct: 0.1,
  lightTrailCritChance: 0.08,

  // 旧基线 +20%；提高到 +50% 后，相对旧基线的实际 DPS 为 1.5 / 1.2 = +25%。
  simonDamageBonus: 0.5,
  simonBounceRatio: 0.25,
  simonBounceRange: 160,
  simonShieldCoins: 15,
  simonMaxShields: 2,
  simonShieldIframes: 0.3,

  maxWeapons: 4,
  maxWeaponLevel: 3,
  weaponLevelDamage: 1.25,
  weaponLevelCooldown: 0.94,
  weaponSellRefundPct: 0.5,
  weaponUpgradeDiscount: 0.8,

  moduleMaxStacks: 3,

  shopOfferCount: 4,
  shopWeaponWeight: 0.4,
  shopRefreshBase: 5,
  shopRefreshStep: 4,

  upgradeOfferCount: 3,
  skipUpgradeCoins: 8,
  repairHealPct: 0.2,

  bossPhase2HpPct: 0.5,
  bossPhase2SpeedPct: 0.15,
  bossPhase2AttackSpeedPct: 0.25,
  bossSoftEnrageSeconds: 60,
  bossSoftEnrageSpeedPct: 0.2,
  bossSoftEnrageAttackSpeedPct: 0.3,

  enemyHpGrowth: 0.12,
  enemyHpMultiplier: 0.8,
  enemyDamageGrowth: 0.07,
  spawnWarning: 0.6,
  spawnMinDistance: 260,
  waveSpawnRampSeconds: 3,
  /** 每波开场 3 秒内使用更慢的间隔，给玩家调整站位的时间。 */
  spawnRampInterval: 1.5,
} as const;
