import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResultView } from '../../game/types';
import {
  buildSubmission,
  computeLeaderboardScore,
  getLeaderboardSource,
  loadLeaderboard,
  normalizeNickname,
  parseLeaderboardRows,
  submitLeaderboard,
  type LeaderboardSubmitInput,
} from './leaderboard';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: MemoryStorage;

function installStorage(value: Storage): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value,
  });
}

function makeResult(overrides: Partial<ResultView> = {}): ResultView {
  return {
    victory: false,
    characterId: 'sunsetNeedle',
    characterName: '夕阳针',
    wave: 5,
    kills: 120,
    damage: 12_345,
    bestHit: 420,
    elapsedSeconds: 321,
    remainingHp: 0,
    maxHp: 100,
    coins: 30,
    coinsEarned: 80,
    shields: 0,
    weapons: [],
    upgrades: [],
    modules: [],
    ...overrides,
  };
}

const LOCAL_INPUT: LeaderboardSubmitInput = {
  nickname: '本地测试',
  characterId: 'simon',
  victory: false,
  wave: 4,
  kills: 50,
  damage: 20_000,
  elapsedSeconds: 240,
};

beforeEach(() => {
  storage = new MemoryStorage();
  installStorage(storage);
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('leaderboard score', () => {
  it('puts victory above every defeat and wave above kills', () => {
    const victory = computeLeaderboardScore({
      victory: true,
      wave: 8,
      kills: 0,
      damage: 0,
    });
    const defeatBoss = computeLeaderboardScore({
      victory: false,
      wave: 8,
      kills: 0,
      damage: 0,
    });
    const maxWaveSeven = computeLeaderboardScore({
      victory: false,
      wave: 7,
      kills: 999,
      damage: 999_000,
    });

    expect(victory).toBeGreaterThan(defeatBoss);
    expect(defeatBoss).toBeGreaterThan(maxWaveSeven);
  });

  it('caps kills and damage contributions', () => {
    const score = computeLeaderboardScore({
      victory: false,
      wave: 3,
      kills: 5_000,
      damage: 999_999_999,
    });

    expect(score).toBe(3_000_000 + 999_000 + 999);
  });

  it('treats fractional stats as rounded integers', () => {
    const score = computeLeaderboardScore({
      victory: false,
      wave: 2,
      kills: 12.6,
      damage: 2_999.9,
    });

    expect(score).toBe(2_000_000 + 13_000 + 3);
  });
});

describe('leaderboard submission', () => {
  it('normalizes nicknames and rounds stats', () => {
    const result = makeResult({
      victory: true,
      wave: 8,
      kills: 12.6,
      damage: 1_234.9,
      elapsedSeconds: 99.6,
    });

    expect(buildSubmission(result, '  测试员  ')).toEqual({
      nickname: '测试员',
      characterId: 'sunsetNeedle',
      victory: true,
      wave: 8,
      kills: 13,
      damage: 1_235,
      elapsedSeconds: 100,
    });
  });

  it('rejects empty nicknames and inconsistent victory records', () => {
    expect(() => buildSubmission(makeResult(), '   ')).toThrow('署名');
    expect(() =>
      buildSubmission(makeResult({ victory: true, wave: 7 }), '测试员'),
    ).toThrow('通关');
  });

  it('strips control characters and limits nicknames to 16 code points', () => {
    expect(normalizeNickname('a\u0000b\nc')).toBe('abc');
    expect(Array.from(normalizeNickname('😀'.repeat(20)))).toHaveLength(16);
  });
});

describe('leaderboard row parsing', () => {
  it('parses PostgREST rows and sorts by score', () => {
    const entries = parseLeaderboardRows([
      {
        id: 2,
        nickname: 'B',
        character_id: 'simon',
        victory: true,
        wave: 8,
        kills: 10,
        damage: '100000',
        elapsed_seconds: 600,
        score: '18000100',
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 1,
        nickname: 'A',
        character_id: 'sunsetNeedle',
        victory: false,
        wave: 8,
        kills: 900,
        damage: 500_000,
        elapsed_seconds: 500,
        score: '8000999',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 3,
        nickname: '',
        character_id: 'junyi',
        victory: false,
        wave: 2,
        kills: 1,
        damage: 1,
        elapsed_seconds: 10,
        score: 2_000_000,
        created_at: '2026-01-03T00:00:00.000Z',
      },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.nickname)).toEqual(['B', 'A']);
  });
});

describe('local fallback', () => {
  it('uses localStorage when Supabase is not configured', async () => {
    expect(getLeaderboardSource()).toBe('local');

    const created = await submitLeaderboard(LOCAL_INPUT);
    const entries = await loadLeaderboard();

    expect(created.score).toBe(4_000_000 + 50_000 + 20);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.nickname).toBe('本地测试');
    expect(entries[0]?.id).toBe(created.id);
  });
});

describe('remote leaderboard', () => {
  it('reads through the Supabase REST endpoint with anon headers', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co/');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 9,
            nickname: 'Remote',
            character_id: 'simon',
            victory: true,
            wave: 8,
            kills: 20,
            damage: 50_000,
            elapsed_seconds: 500,
            score: 18_020_050,
            created_at: '2026-01-04T00:00:00.000Z',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    expect(getLeaderboardSource()).toBe('remote');

    const entries = await loadLeaderboard();

    expect(entries[0]?.nickname).toBe('Remote');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://demo.supabase.co/rest/v1/leaderboard?'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer anon-key',
        }),
      }),
    );
  });

  it('posts raw stats and parses the created row', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 10,
            nickname: '本地测试',
            character_id: 'simon',
            victory: false,
            wave: 4,
            kills: 50,
            damage: 20_000,
            elapsed_seconds: 240,
            score: 4_050_020,
            created_at: '2026-01-04T00:00:00.000Z',
          },
        ]),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const created = await submitLeaderboard(LOCAL_INPUT);
    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect(created.id).toBe('10');
    expect(created.score).toBe(4_050_020);
    expect(url).toBe('https://demo.supabase.co/rest/v1/leaderboard');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
      Prefer: 'return=representation',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      nickname: '本地测试',
      character_id: 'simon',
      victory: false,
      wave: 4,
      kills: 50,
      damage: 20_000,
      elapsed_seconds: 240,
    });
  });
});
