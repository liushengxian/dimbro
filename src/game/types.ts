import type { AudioCue } from './audio';

export type CharacterId = 'sunsetNeedle' | 'simon' | 'junyi';
export type PlayableCharacterId = Exclude<CharacterId, 'junyi'>;

export type WeaponId =
  | 'pulseNailer'
  | 'scatterRivets'
  | 'arcHammer'
  | 'returnGear'
  | 'railSpike';

export type UpgradeId =
  | 'dmg'
  | 'atk'
  | 'move'
  | 'armor'
  | 'hp'
  | 'regen'
  | 'crit'
  | 'critdmg'
  | 'pickup'
  | 'range'
  | 'coin'
  | 'knockback'
  | 'overclock'
  | 'overdrive'
  | 'heavyArmor'
  | 'greed'
  | 'glassCannon'
  | 'shortCircuit';

export type ModuleId =
  | 'coolingFan'
  | 'hollowPoint'
  | 'servoBearing'
  | 'compositeArmor'
  | 'emergencyBattery'
  | 'repairArm'
  | 'magneticChassis'
  | 'tacticalLens'
  | 'coinAmplifier'
  | 'spareMagazine';

export type EnemyId = 'biter' | 'drone' | 'charger' | 'spitter' | 'overseer' | 'forgeCore';

export type WeaponBehavior = 'projectile' | 'shotgun' | 'melee' | 'boomerang' | 'rail';

export type EnemyBehavior = 'chaser' | 'weaver' | 'charger' | 'spitter' | 'overseer' | 'boss';

export interface PassiveDef {
  id: string;
  name: string;
  summary: string;
  description: string;
}

export interface CharacterPalette {
  primary: string;
  secondary: string;
  glow: string;
  suit: string;
  visor: string;
  metal: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  callsign: string;
  role: string;
  tagline: string;
  description: string;
  hint: string;
  enabled: boolean;
  difficulty: 1 | 2 | 3;
  startingWeaponId: WeaponId;
  base: {
    maxHp: number;
    armor: number;
    moveSpeed: number;
    damagePct: number;
    attackSpeedPct: number;
    critChance: number;
  };
  passives: PassiveDef[];
  palette: CharacterPalette;
  appearanceNotes: string[];
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  role: string;
  description: string;
  behavior: WeaponBehavior;
  baseDamage: number;
  cooldown: number;
  range: number;
  price: number;
  projectileSpeed: number;
  projectileRadius: number;
  pelletCount: number;
  spreadDeg: number;
  pierce: number;
  knockback: number;
  icon: string;
  color: string;
  /** Lv.2 / Lv.3 的专属颜色，用于让武器升级在战斗中一眼可见。 */
  upgradeColors: readonly [string, string];
}

export type StatEffectKind =
  | 'maxHp'
  | 'armor'
  | 'damagePct'
  | 'attackSpeedPct'
  | 'moveSpeedPct'
  | 'critChance'
  | 'critDamagePct'
  | 'pickupRadius'
  | 'regen'
  | 'rangePct'
  | 'coinPct'
  | 'knockbackPct'
  | 'damageTakenPct'
  | 'cooldownMul';

export interface StatEffect {
  kind: StatEffectKind;
  value: number;
  heal?: number;
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxStacks: number;
  icon: string;
  effect: StatEffect;
  /** 风险卡的负面效果，与 effect 同时生效。 */
  penalty?: StatEffect;
  /** 风险卡在三选一中每轮最多出现 1 张，并在 UI 上单独标记。 */
  risk?: boolean;
}

export interface ModuleDef {
  id: ModuleId;
  name: string;
  description: string;
  price: number;
  maxStacks: number;
  icon: string;
  effect: StatEffect;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  role: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  contactDamage: number;
  coin: number;
  radius: number;
  spawnCost: number;
  elite: boolean;
  boss: boolean;
  color: string;
  accent: string;
}

export interface WaveDef {
  wave: number;
  duration: number | null;
  reward: number;
  label: string;
  hint: string;
  /** 预生成队列中的杂兵数量；精英不占用该数量。 */
  targetUnits: number;
  /** 本波目标总血量，包含精英；队列按扣除精英后的杂兵血量生成。 */
  targetHp: number;
  spawnWeights: Partial<Record<EnemyId, number>>;
  /** 精英出现时机，按波次时长归一化到 0–1。 */
  eliteAtPct: number[];
  boss: boolean;
}

export interface WeaponInstance {
  id: WeaponId;
  level: number;
  paid: number;
}

export interface RunTotals {
  kills: number;
  damage: number;
  bestHit: number;
  elapsedSeconds: number;
  coinsEarned: number;
}

export interface RunState {
  seed: number;
  characterId: PlayableCharacterId;
  wave: number;
  coins: number;
  /** 金币加成的小数余量，保证 +15% / +30% 在 1 金币掉落上也能长期生效。 */
  coinRemainder: number;
  currentHp: number;
  shields: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  modules: Partial<Record<ModuleId, number>>;
  weapons: WeaponInstance[];
  totals: RunTotals;
}

export interface SaveData {
  version: 1;
  savedAt: number;
  rngState: number;
  run: RunState;
}

export interface PlayerStats {
  maxHp: number;
  armor: number;
  damagePct: number;
  attackSpeedPct: number;
  moveSpeed: number;
  moveSpeedPct: number;
  critChance: number;
  critDamagePct: number;
  pickupRadius: number;
  rangePct: number;
  coinPct: number;
  knockbackPct: number;
  regen: number;
  damageTakenPct: number;
  cooldownMul: number;
}

export interface Settings {
  music: boolean;
  sound: boolean;
  shake: boolean;
}

export interface WorldPlayer {
  x: number;
  y: number;
  radius: number;
  hp: number;
  iframes: number;
  facingX: number;
  facingY: number;
  hitFlash: number;
  regenAccumulator: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

export interface WeaponRuntime {
  id: WeaponId;
  level: number;
  cooldown: number;
  cooldownTotal: number;
}

export type EnemyMode =
  | 'chase'
  | 'telegraph'
  | 'dash'
  | 'stunned'
  | 'recover'
  | 'bossIntro'
  | 'bossIdle'
  | 'bossTelegraph'
  | 'bossDash'
  | 'bossCharge'
  | 'bossCast'
  | 'bossSummon'
  | 'bossStun';

export interface EnemyEntity {
  id: number;
  defId: EnemyId;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  coinValue: number;
  mode: EnemyMode;
  modeTimer: number;
  attackTimer: number;
  angle: number;
  dirX: number;
  dirY: number;
  pushX: number;
  pushY: number;
  hitFlash: number;
  elite: boolean;
  boss: boolean;
  phase: 1 | 2;
  invuln: number;
  softEnrage: boolean;
  ability: 'dash' | 'barrage' | 'summon' | null;
  abilityCooldown: number;
  dashCount: number;
  targetX: number;
  targetY: number;
  burnTimer: number;
  dead: boolean;
}

export type ProjectileKind = 'player' | 'enemy';

export interface ProjectileEntity {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  crit: boolean;
  remainingPierce: number;
  hitIds: Set<number>;
  life: number;
  maxLife: number;
  weaponId: WeaponId | null;
  attackId: number;
  color: string;
  returning: boolean;
  traveled: number;
  maxDistance: number;
  originX: number;
  originY: number;
  dead: boolean;
}

export interface PickupEntity {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
  vx: number;
  vy: number;
  magnet: boolean;
  dead: boolean;
}

export interface HazardEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  tickTimer: number;
  damage: number;
  dead: boolean;
}

export type EffectKind =
  | 'muzzle'
  | 'hit'
  | 'kill'
  | 'reset'
  | 'shield'
  | 'shieldBreak'
  | 'bounce'
  | 'arc'
  | 'burn'
  | 'ring'
  | 'level'
  | 'spawn';

export interface EffectEntity {
  id: number;
  kind: EffectKind;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  angle: number;
}

export interface DamageText {
  id: number;
  x: number;
  y: number;
  value: number;
  crit: boolean;
  life: number;
  maxLife: number;
}

export interface SpawnWarning {
  id: number;
  x: number;
  y: number;
  defId: EnemyId;
  timer: number;
  maxTimer: number;
  radius: number;
}

export interface PassiveRuntime {
  resetActive: boolean;
  resetRemaining: number;
  resetMax: number;
  moveHold: number;
  idleTime: number;
  lightTrailActive: boolean;
}

export interface WaveStats {
  pickedCoins: number;
  reward: number;
  simonRepairCoins: number;
  lostCoins: number;
  shieldsGained: number;
  kills: number;
  damage: number;
  duration: number;
}

export interface BattleWorld {
  wave: number;
  elapsed: number;
  timeLeft: number;
  duration: number | null;
  bossWave: boolean;
  player: WorldPlayer;
  weapons: WeaponRuntime[];
  enemies: EnemyEntity[];
  playerProjectiles: ProjectileEntity[];
  enemyProjectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  hazards: HazardEntity[];
  effects: EffectEntity[];
  damageTexts: DamageText[];
  spawnWarnings: SpawnWarning[];
  /** 本波预生成的杂兵刷怪队列。 */
  spawnQueue: EnemyId[];
  spawnQueueBuilt: boolean;
  /** 队列中剩余未刷出的杂兵数量，用于调试面板。 */
  spawnRemaining: number;
  spawnTimer: number;
  spawnLocked: boolean;
  eliteSchedule: number[];
  bossId: number | null;
  bossDefeated: boolean;
  victoryTimer: number | null;
  attackCounter: number;
  rolledAttacks: Set<number>;
  passive: PassiveRuntime;
  waveStats: WaveStats;
  audioCues: AudioCue[];
  nextId: number;
  fps: number;
}

export type GamePhase =
  | 'idle'
  | 'battle'
  | 'waveClear'
  | 'upgrade'
  | 'shop'
  | 'victory'
  | 'defeat';

export interface WeaponHudState {
  id: WeaponId;
  name: string;
  icon: string;
  level: number;
  cooldown: number;
  cooldownTotal: number;
  color: string;
}

export interface BossHudState {
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  enraged: boolean;
}

export interface PassiveHudState {
  resetActive: boolean;
  resetRemaining: number;
  resetMax: number;
  lightTrailActive: boolean;
  moveHold: number;
  idleTime: number;
  simonShields: number;
}

export interface WaveSummary {
  wave: number;
  pickedCoins: number;
  reward: number;
  simonRepairCoins: number;
  lostCoins: number;
  shieldsGained: number;
  kills: number;
  damage: number;
  duration: number;
}

export interface UpgradeChoice {
  id: UpgradeId | 'repair';
  name: string;
  description: string;
  icon: string;
  stacks: number;
  maxStacks: number;
  type: 'upgrade' | 'repair';
  risk: boolean;
}

export interface ShopOfferView {
  id: string;
  kind: 'weapon' | 'module';
  refId: WeaponId | ModuleId;
  name: string;
  description: string;
  price: number;
  sold: boolean;
  canAfford: boolean;
  icon: string;
  level?: number;
  /** 武器当前 / 升级后等级对应的颜色；模块无颜色。 */
  color?: string;
  detail: string;
}

export interface ShopView {
  offers: ShopOfferView[];
  refreshCost: number;
  pendingOfferId: string | null;
  moduleSummary: Array<{ id: ModuleId; name: string; count: number }>;
}

export interface ResultView {
  victory: boolean;
  characterId: PlayableCharacterId;
  characterName: string;
  wave: number;
  kills: number;
  damage: number;
  bestHit: number;
  elapsedSeconds: number;
  remainingHp: number;
  maxHp: number;
  coins: number;
  coinsEarned: number;
  shields: number;
  weapons: Array<{ id: WeaponId; name: string; level: number }>;
  upgrades: Array<{ id: UpgradeId; name: string; stacks: number }>;
  modules: Array<{ id: ModuleId; name: string; count: number }>;
}

export interface DebugState {
  fps: number;
  enemies: number;
  playerProjectiles: number;
  enemyProjectiles: number;
  pickups: number;
  spawnRemaining: number;
  seed: number;
  wave: number;
  phase: GamePhase;
}

export interface SessionSnapshot {
  version: number;
  phase: GamePhase;
  paused: boolean;
  run: RunState | null;
  wave: number;
  waveLabel: string;
  waveTimeLeft: number;
  waveDuration: number | null;
  waveProgress: number;
  bossWave: boolean;
  player: {
    hp: number;
    maxHp: number;
    armor: number;
    iframes: number;
    lowHp: boolean;
  };
  stats: PlayerStats | null;
  coins: number;
  weapons: WeaponHudState[];
  passives: PassiveHudState | null;
  boss: BossHudState | null;
  waveSummary: WaveSummary | null;
  upgradeChoices: UpgradeChoice[];
  shop: ShopView | null;
  result: ResultView | null;
  debug: DebugState;
}

export type PurchaseResult =
  | { status: 'ok' }
  | { status: 'needs-slot' }
  | { status: 'error'; message: string };

export interface StoredSettings {
  version: 2;
  music: boolean;
  sound: boolean;
  shake: boolean;
}
