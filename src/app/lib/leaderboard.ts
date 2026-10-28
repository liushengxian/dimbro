/**
 * 排行榜数据层。
 *
 * 生产环境通过 Supabase REST（PostgREST）读写；没有配置 VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY 时自动退化为 localStorage 本地榜，方便本地开发和预览。
 *
 * 排行榜只信任服务端计算出的 score。客户端提交原始战绩，数据库通过
 * generated column 计算分数，并用 CHECK 约束限制取值范围。
 */

import type { PlayableCharacterId, ResultView } from '../../game/types';

export type LeaderboardSource = 'remote' | 'local';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  characterId: PlayableCharacterId;
  victory: boolean;
  wave: number;
  kills: number;
  damage: number;
  elapsedSeconds: number;
  score: number;
  createdAt: string;
}

export interface LeaderboardSubmitInput {
  nickname: string;
  characterId: PlayableCharacterId;
  victory: boolean;
  wave: number;
  kills: number;
  damage: number;
  elapsedSeconds: number;
}

interface RemoteConfig {
  url: string;
  anonKey: string;
}

const LOCAL_KEY = 'dimbro.leaderboard.local.v1';
const NICKNAME_KEY = 'dimbro.leaderboard.nickname.v1';
const SUBMITTED_KEY = 'dimbro.leaderboard.submitted.v1';
const MAX_LOCAL_ENTRIES = 50;
const MAX_NICKNAME_LENGTH = 16;
const REQUEST_TIMEOUT_MS = 10_000;

const VICTORY_BONUS = 10_000_000;
const WAVE_WEIGHT = 1_000_000;
const KILL_WEIGHT = 1_000;
const DAMAGE_DIVISOR = 1_000;
const STAT_CAP = 999;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlayableCharacterId(value: unknown): value is PlayableCharacterId {
  return value === 'sunsetNeedle' || value === 'simon';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNonNegativeInteger(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) return null;
  return Math.round(parsed);
}

function getStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage | null }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

function getEnv(): Record<string, string | undefined> {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };
  return meta.env ?? {};
}

function getRemoteConfig(): RemoteConfig | null {
  const env = getEnv();
  const url = (env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!/^https?:\/\//i.test(url) || anonKey.length === 0) return null;
  return { url, anonKey };
}

/** 当前页面是连接 Supabase 还是使用本地回退榜。 */
export function getLeaderboardSource(): LeaderboardSource {
  return getRemoteConfig() === null ? 'local' : 'remote';
}

/** 清理控制字符、首尾空格，并按 Unicode 字符截断到 16 个。 */
export function normalizeNickname(value: string): string {
  const cleaned = value.replace(CONTROL_CHARS, '').trim();
  return Array.from(cleaned).slice(0, MAX_NICKNAME_LENGTH).join('');
}

/**
 * 战绩分：通关 > 波次 > 击杀 > 伤害。
 * 击杀和伤害各自最多贡献 999 分，保证不会跨波次反超。
 */
export function computeLeaderboardScore(
  entry: Pick<LeaderboardSubmitInput, 'victory' | 'wave' | 'kills' | 'damage'>,
): number {
  const wave = Math.max(0, Math.round(entry.wave));
  const kills = Math.max(0, Math.round(entry.kills));
  const damage = Math.max(0, Math.round(entry.damage));

  return (
    (entry.victory ? VICTORY_BONUS : 0) +
    wave * WAVE_WEIGHT +
    Math.min(STAT_CAP, kills) * KILL_WEIGHT +
    Math.min(STAT_CAP, Math.floor(damage / DAMAGE_DIVISOR))
  );
}

export function resultFingerprint(result: ResultView): string {
  return [
    result.characterId,
    result.victory ? 'victory' : 'defeat',
    Math.round(result.wave),
    Math.round(result.kills),
    Math.round(result.damage),
    Math.round(result.elapsedSeconds),
    Math.round(result.bestHit),
    Math.round(result.coinsEarned),
  ].join('|');
}

export function buildSubmission(result: ResultView, nickname: string): LeaderboardSubmitInput {
  const normalized = normalizeNickname(nickname);
  if (normalized.length === 0) {
    throw new Error('请输入 1–16 个字符的署名。');
  }
  if (!isPlayableCharacterId(result.characterId)) {
    throw new Error('角色数据异常，无法上传。');
  }

  const wave = Math.round(result.wave);
  const kills = Math.round(result.kills);
  const damage = Math.round(result.damage);
  const elapsedSeconds = Math.round(result.elapsedSeconds);

  if (![wave, kills, damage, elapsedSeconds].every(Number.isFinite)) {
    throw new Error('战绩数据异常，无法上传。');
  }
  if (wave < 1 || wave > 8) {
    throw new Error('波次数据异常，无法上传。');
  }
  if (result.victory && wave !== 8) {
    throw new Error('通关战绩数据异常，无法上传。');
  }
  if (kills < 0 || kills > 100_000 || damage < 0 || damage > 100_000_000_000) {
    throw new Error('战绩数据超出排行榜允许范围。');
  }
  if (elapsedSeconds < 0 || elapsedSeconds > 86_400) {
    throw new Error('用时数据超出排行榜允许范围。');
  }

  return {
    nickname: normalized,
    characterId: result.characterId,
    victory: result.victory,
    wave,
    kills,
    damage,
    elapsedSeconds,
  };
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.score - a.score ||
      a.elapsedSeconds - b.elapsedSeconds ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

function parseEntryShape(
  value: Record<string, unknown>,
  characterKey: 'characterId' | 'character_id',
  elapsedKey: 'elapsedSeconds' | 'elapsed_seconds',
): LeaderboardEntry | null {
  const nickname = typeof value.nickname === 'string' ? normalizeNickname(value.nickname) : '';
  const characterId = value[characterKey];
  const victory = value.victory;
  const wave = toNonNegativeInteger(value.wave);
  const kills = toNonNegativeInteger(value.kills);
  const damage = toNonNegativeInteger(value.damage);
  const elapsedSeconds = toNonNegativeInteger(value[elapsedKey]);

  if (
    nickname.length === 0 ||
    !isPlayableCharacterId(characterId) ||
    typeof victory !== 'boolean' ||
    wave === null ||
    kills === null ||
    damage === null ||
    elapsedSeconds === null
  ) {
    return null;
  }
  if (wave < 1 || wave > 8 || (victory && wave !== 8)) return null;

  const scoreValue = toFiniteNumber(value.score);
  const score =
    scoreValue === null
      ? computeLeaderboardScore({ victory, wave, kills, damage })
      : Math.round(scoreValue);
  const createdAt = typeof value.created_at === 'string'
    ? value.created_at
    : typeof value.createdAt === 'string'
      ? value.createdAt
      : new Date(0).toISOString();
  const rawId = value.id;
  const id =
    typeof rawId === 'string' || typeof rawId === 'number'
      ? String(rawId)
      : `entry-${createdAt}-${nickname}`;

  return {
    id,
    nickname,
    characterId,
    victory,
    wave,
    kills,
    damage,
    elapsedSeconds,
    score,
    createdAt,
  };
}

function parseRemoteEntry(value: unknown): LeaderboardEntry | null {
  if (!isRecord(value)) return null;
  return parseEntryShape(value, 'character_id', 'elapsed_seconds');
}

function parseLocalEntry(value: unknown): LeaderboardEntry | null {
  if (!isRecord(value)) return null;
  return parseEntryShape(value, 'characterId', 'elapsedSeconds');
}

/** 解析 PostgREST 返回的数组；无效行会被丢弃，避免一条脏数据拖垮整个榜单。 */
export function parseLeaderboardRows(value: unknown, limit = 20): LeaderboardEntry[] {
  if (!Array.isArray(value)) {
    throw new Error('排行榜数据格式异常。');
  }

  const entries: LeaderboardEntry[] = [];
  for (const row of value) {
    const entry = parseRemoteEntry(row);
    if (entry !== null) entries.push(entry);
  }
  return sortEntries(entries).slice(0, limit);
}

function readLocalEntries(): LeaderboardEntry[] {
  const storage = getStorage();
  if (storage === null) return [];

  try {
    const raw = storage.getItem(LOCAL_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const entries: LeaderboardEntry[] = [];
    for (const row of parsed) {
      const entry = parseLocalEntry(row);
      if (entry !== null) entries.push(entry);
    }
    return sortEntries(entries).slice(0, MAX_LOCAL_ENTRIES);
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: LeaderboardEntry[]): void {
  const storage = getStorage();
  if (storage === null) {
    throw new Error('本地存储不可用，无法保存排行榜。');
  }

  try {
    storage.setItem(LOCAL_KEY, JSON.stringify(sortEntries(entries).slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    throw new Error('本地存储写入失败，请检查浏览器隐私设置。');
  }
}

function readSubmittedFingerprints(): string[] {
  const storage = getStorage();
  if (storage === null) return [];

  try {
    const raw = storage.getItem(SUBMITTED_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, 100);
  } catch {
    return [];
  }
}

export function hasSubmittedFingerprint(fingerprint: string): boolean {
  return readSubmittedFingerprints().includes(fingerprint);
}

export function markFingerprintSubmitted(fingerprint: string): void {
  const storage = getStorage();
  if (storage === null) return;

  const fingerprints = readSubmittedFingerprints();
  if (fingerprints.includes(fingerprint)) return;
  fingerprints.unshift(fingerprint);

  try {
    storage.setItem(SUBMITTED_KEY, JSON.stringify(fingerprints.slice(0, 100)));
  } catch {
    // 记录失败不应阻止已经成功的排行榜上传。
  }
}

export function readNickname(): string {
  const storage = getStorage();
  if (storage === null) return '';

  try {
    const raw = storage.getItem(NICKNAME_KEY);
    return raw === null ? '' : normalizeNickname(raw);
  } catch {
    return '';
  }
}

export function writeNickname(value: string): void {
  const storage = getStorage();
  if (storage === null) return;

  const normalized = normalizeNickname(value);
  if (normalized.length === 0) return;

  try {
    storage.setItem(NICKNAME_KEY, normalized);
  } catch {
    // 昵称持久化失败不影响本次上传。
  }
}

function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function remoteHeaders(config: RemoteConfig): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    Accept: 'application/json',
  };
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('排行榜请求超时，请稍后重试。');
    }
    throw new Error('无法连接排行榜服务，请检查网络或 Supabase 配置。');
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!response.ok) {
    let detail = text.slice(0, 240);
    if (detail.length > 0) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (isRecord(parsed) && typeof parsed.message === 'string') {
          detail = parsed.message.slice(0, 240);
        } else if (isRecord(parsed) && typeof parsed.hint === 'string') {
          detail = parsed.hint.slice(0, 240);
        }
      } catch {
        // 保留原始响应片段。
      }
    }
    throw new Error(`排行榜服务返回 ${response.status}${detail ? `：${detail}` : ''}`);
  }

  if (text.length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('排行榜返回了无法解析的数据。');
  }
}

/** 读取前 N 条记录。未配置 Supabase 时读取本地榜。 */
export async function loadLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const config = getRemoteConfig();
  if (config === null) {
    return readLocalEntries().slice(0, limit);
  }

  const query = new URLSearchParams({
    select:
      'id,nickname,character_id,victory,wave,kills,damage,elapsed_seconds,score,created_at',
    order: 'score.desc,elapsed_seconds.asc,created_at.asc',
    limit: String(limit),
  });

  const response = await request(`${config.url}/rest/v1/leaderboard?${query.toString()}`, {
    method: 'GET',
    headers: remoteHeaders(config),
  });
  const payload = await readJson(response);
  return parseLeaderboardRows(payload, limit);
}

/** 提交一条战绩。未配置 Supabase 时写入本地榜。 */
export async function submitLeaderboard(
  input: LeaderboardSubmitInput,
): Promise<LeaderboardEntry> {
  const config = getRemoteConfig();

  if (config === null) {
    const entry: LeaderboardEntry = {
      id: createId(),
      ...input,
      score: computeLeaderboardScore(input),
      createdAt: new Date().toISOString(),
    };
    writeLocalEntries([entry, ...readLocalEntries()]);
    return entry;
  }

  const response = await request(`${config.url}/rest/v1/leaderboard`, {
    method: 'POST',
    headers: {
      ...remoteHeaders(config),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      nickname: input.nickname,
      character_id: input.characterId,
      victory: input.victory,
      wave: input.wave,
      kills: input.kills,
      damage: input.damage,
      elapsed_seconds: input.elapsedSeconds,
    }),
  });

  const payload = await readJson(response);
  const created = Array.isArray(payload) ? parseRemoteEntry(payload[0]) : null;
  if (created === null) {
    throw new Error('排行榜写入未返回记录，请检查 Supabase 的 RLS 配置。');
  }
  return created;
}
