/**
 * LocalStorage 存取层：对局存档、设置、首次操作说明。
 *
 * 运行时读取 localStorage（不在模块顶层缓存），因此 SSR / 测试环境没有
 * localStorage 时全部安全降级；所有访问与 JSON 解析都包在 try/catch 中。
 */

import { BALANCE } from '../../game/data/balance';
import { MODULES_BY_ID } from '../../game/data/modules';
import { UPGRADES_BY_ID } from '../../game/data/upgrades';
import { WEAPONS_BY_ID } from '../../game/data/weapons';
import { computePlayerStats } from '../../game/systems/progression';
import type {
  ModuleId,
  PlayableCharacterId,
  RunState,
  SaveData,
  Settings,
  StoredSettings,
  UpgradeId,
  WeaponId,
  WeaponInstance,
} from '../../game/types';

export const SAVE_KEY = 'dimbro.save.v1';
export const SETTINGS_KEY = 'dimbro.settings.v1';
export const INTRO_KEY = 'dimbro.intro.v1';

const DEFAULT_SETTINGS: Readonly<Settings> = { sound: true, shake: true };

function getStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage | null }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return isInteger(value) && value >= min && value <= max;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isSafeInteger(value: unknown): value is number {
  return isInteger(value) && Number.isSafeInteger(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlayableCharacterId(value: unknown): value is PlayableCharacterId {
  return value === 'sunsetNeedle' || value === 'simon';
}

function parseUpgrades(value: unknown): RunState['upgrades'] | null {
  if (!isRecord(value)) return null;

  const upgrades: RunState['upgrades'] = {};
  for (const key of Object.keys(value)) {
    if (!hasOwn(UPGRADES_BY_ID, key)) return null;
    const def = UPGRADES_BY_ID[key as UpgradeId];
    const stacks = value[key];
    if (def === undefined || !isIntegerInRange(stacks, 0, def.maxStacks)) return null;
    upgrades[key as UpgradeId] = stacks;
  }
  return upgrades;
}

function parseModules(value: unknown): RunState['modules'] | null {
  if (!isRecord(value)) return null;

  const modules: RunState['modules'] = {};
  for (const key of Object.keys(value)) {
    if (!hasOwn(MODULES_BY_ID, key)) return null;
    const def = MODULES_BY_ID[key as ModuleId];
    const count = value[key];
    if (def === undefined || !isIntegerInRange(count, 0, def.maxStacks)) return null;
    modules[key as ModuleId] = count;
  }
  return modules;
}

function parseWeapons(value: unknown): WeaponInstance[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < 1 || value.length > BALANCE.maxWeapons) return null;

  const weapons: WeaponInstance[] = [];
  const seen = new Set<WeaponId>();

  for (const entry of value) {
    if (!isRecord(entry)) return null;

    const id = entry.id;
    if (typeof id !== 'string' || !hasOwn(WEAPONS_BY_ID, id)) return null;
    const weaponId = id as WeaponId;
    if (WEAPONS_BY_ID[weaponId] === undefined) return null;
    if (seen.has(weaponId)) return null;

    const level = entry.level;
    if (!isIntegerInRange(level, 1, BALANCE.maxWeaponLevel)) return null;

    const paid = entry.paid;
    if (!isNonNegativeNumber(paid)) return null;

    seen.add(weaponId);
    weapons.push({ id: weaponId, level, paid });
  }

  return weapons;
}

function parseTotals(value: unknown): RunState['totals'] | null {
  if (!isRecord(value)) return null;

  const kills = value.kills;
  const damage = value.damage;
  const bestHit = value.bestHit;
  const elapsedSeconds = value.elapsedSeconds;
  const coinsEarned = value.coinsEarned;

  if (
    !isNonNegativeNumber(kills) ||
    !isNonNegativeNumber(damage) ||
    !isNonNegativeNumber(bestHit) ||
    !isNonNegativeNumber(elapsedSeconds) ||
    !isNonNegativeNumber(coinsEarned)
  ) {
    return null;
  }

  return { kills, damage, bestHit, elapsedSeconds, coinsEarned };
}

function parseRun(value: unknown): RunState | null {
  if (!isRecord(value)) return null;

  const characterId = value.characterId;
  if (!isPlayableCharacterId(characterId)) return null;

  const seed = value.seed;
  if (!isSafeInteger(seed)) return null;

  const wave = value.wave;
  if (!isIntegerInRange(wave, 1, BALANCE.waveCount)) return null;

  const coins = value.coins;
  if (!isNonNegativeInteger(coins)) return null;

  const shields = value.shields;
  if (!isIntegerInRange(shields, 0, BALANCE.simonMaxShields)) return null;

  const currentHp = value.currentHp;
  if (!isFiniteNumber(currentHp) || currentHp <= 0) return null;

  const upgrades = parseUpgrades(value.upgrades);
  if (upgrades === null) return null;

  const modules = parseModules(value.modules);
  if (modules === null) return null;

  const weapons = parseWeapons(value.weapons);
  if (weapons === null) return null;

  const totals = parseTotals(value.totals);
  if (totals === null) return null;

  const run: RunState = {
    seed,
    characterId,
    wave,
    coins,
    currentHp,
    shields,
    upgrades,
    modules,
    weapons,
    totals,
  };

  // 当前生命不能超过由角色 + 升级 + 模块推导出的上限。
  const maxHp = computePlayerStats(run).maxHp;
  if (currentHp > maxHp) return null;

  return run;
}

function parseSave(value: unknown): SaveData | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1) return null;

  const savedAt = value.savedAt;
  if (!isNonNegativeNumber(savedAt)) return null;

  const rngState = value.rngState;
  if (!isIntegerInRange(rngState, 0, 0xffff_ffff)) return null;

  const run = parseRun(value.run);
  if (run === null) return null;

  return { version: 1, savedAt, rngState, run };
}

export function readSave(): SaveData | null {
  const storage = getStorage();
  if (storage === null) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    return parseSave(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeSave(save: SaveData): void {
  const storage = getStorage();
  if (storage === null) return;

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // 配额不足 / 隐私模式：存档失败不应打断游戏。
  }
}

export function clearSave(): void {
  const storage = getStorage();
  if (storage === null) return;

  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // 忽略存储不可用。
  }
}

/** 只有能成功解析出合法 Run 的存档才算「可继续」。 */
export function hasSave(): boolean {
  return readSave() !== null;
}

export function readSettings(): Settings {
  const storage = getStorage();
  if (storage === null) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };

    const parsed: unknown = JSON.parse(raw);
    if (
      isRecord(parsed) &&
      parsed.version === 1 &&
      typeof parsed.sound === 'boolean' &&
      typeof parsed.shake === 'boolean'
    ) {
      return { sound: parsed.sound, shake: parsed.shake };
    }
  } catch {
    // 损坏的设置回退默认值。
  }

  return { ...DEFAULT_SETTINGS };
}

export function writeSettings(settings: Settings): void {
  const storage = getStorage();
  if (storage === null) return;

  const stored: StoredSettings = {
    version: 1,
    sound: settings.sound,
    shake: settings.shake,
  };

  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  } catch {
    // 忽略存储不可用。
  }
}

export function hasSeenIntro(): boolean {
  const storage = getStorage();
  if (storage === null) return false;

  try {
    return storage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  const storage = getStorage();
  if (storage === null) return;

  try {
    storage.setItem(INTRO_KEY, '1');
  } catch {
    // 忽略存储不可用。
  }
}
