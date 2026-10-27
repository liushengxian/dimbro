import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SaveData, Settings, StoredSettings } from '../../game/types';
import { createRun } from '../../game/systems/progression';
import {
  INTRO_KEY,
  SAVE_KEY,
  SETTINGS_KEY,
  clearSave,
  hasSave,
  hasSeenIntro,
  markIntroSeen,
  readSave,
  readSettings,
  writeSave,
  writeSettings,
} from './storage';

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

class ThrowingStorage implements Storage {
  get length(): number {
    return 0;
  }
  clear(): void {
    throw new Error('blocked');
  }
  getItem(): string | null {
    throw new Error('blocked');
  }
  key(): string | null {
    throw new Error('blocked');
  }
  removeItem(): void {
    throw new Error('blocked');
  }
  setItem(): void {
    throw new Error('blocked');
  }
}

let storage: MemoryStorage;

function installStorage(value: Storage): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value,
  });
}

function makeSave(): SaveData {
  const run = createRun('sunsetNeedle', 1234);
  run.totals = {
    kills: 12,
    damage: 345.5,
    bestHit: 42,
    elapsedSeconds: 61.25,
    coinsEarned: 20,
  };
  return {
    version: 1,
    savedAt: 1_700_000_000_000,
    rngState: 0xdead_beef,
    run,
  };
}

function rawSave(): any {
  return JSON.parse(JSON.stringify(makeSave()));
}

function writeRaw(value: unknown): void {
  storage.setItem(SAVE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
}

beforeEach(() => {
  storage = new MemoryStorage();
  installStorage(storage);
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('save data', () => {
  it('round-trips a complete valid save', () => {
    const save = makeSave();
    writeSave(save);

    expect(readSave()).toEqual(save);
    expect(hasSave()).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toEqual(save);
  });

  it('restores upgrades, modules and Simon shields', () => {
    const run = createRun('simon', 99);
    run.shields = 2;
    run.upgrades = { hp: 2, dmg: 3 };
    run.modules = { emergencyBattery: 1, spareMagazine: 2 };
    run.currentHp = 140;
    const save: SaveData = { version: 1, savedAt: 1, rngState: 7, run };
    writeSave(save);

    expect(readSave()).toEqual(save);
  });

  it('has no save initially', () => {
    expect(readSave()).toBeNull();
    expect(hasSave()).toBe(false);
  });

  it('clears a save', () => {
    writeSave(makeSave());
    clearSave();
    expect(readSave()).toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(hasSave()).toBe(false);
  });

  it('rejects corrupted or non-object JSON', () => {
    for (const raw of ['{not json', '', 'null', '[]', '"save"', '42', 'true']) {
      storage.setItem(SAVE_KEY, raw);
      expect(readSave()).toBeNull();
      expect(hasSave()).toBe(false);
    }
  });

  it('rejects a mismatched version', () => {
    const save = rawSave();
    save.version = 2;
    writeRaw(save);
    expect(readSave()).toBeNull();
  });

  it('rejects invalid savedAt or rngState', () => {
    for (const [field, value] of [
      ['savedAt', -1],
      ['savedAt', 'now'],
      ['rngState', -1],
      ['rngState', 1.5],
      ['rngState', 0x1_0000_0000],
      ['rngState', 'abc'],
    ] as const) {
      const save = rawSave();
      save[field] = value;
      writeRaw(save);
      expect(readSave(), `${field}=${String(value)}`).toBeNull();
    }
  });

  it('rejects a missing or malformed run', () => {
    const noRun = rawSave();
    delete noRun.run;
    writeRaw(noRun);
    expect(readSave()).toBeNull();

    const badRun = rawSave();
    badRun.run = [];
    writeRaw(badRun);
    expect(readSave()).toBeNull();
  });

  it('rejects Junyi and unknown characters', () => {
    for (const id of ['junyi', 'unknown', '', 42]) {
      const save = rawSave();
      save.run.characterId = id;
      writeRaw(save);
      expect(readSave(), String(id)).toBeNull();
    }
  });

  it('validates the seed', () => {
    for (const seed of [1.5, 'abc', null, Number.MAX_SAFE_INTEGER + 1]) {
      const save = rawSave();
      save.run.seed = seed;
      writeRaw(save);
      expect(readSave(), String(seed)).toBeNull();
    }
  });

  it('validates wave, coins, currentHp and shields', () => {
    const cases: Array<[string, unknown]> = [
      ['wave', 0],
      ['wave', 9],
      ['wave', 1.5],
      ['wave', '1'],
      ['coins', -1],
      ['coins', 1.5],
      ['coins', '10'],
      ['currentHp', 0],
      ['currentHp', -5],
      ['currentHp', 81],
      ['currentHp', '80'],
      ['shields', -1],
      ['shields', 3],
      ['shields', 1.5],
      ['shields', '2'],
    ];

    for (const [field, value] of cases) {
      const save = rawSave();
      save.run[field] = value;
      writeRaw(save);
      expect(readSave(), `${field}=${String(value)}`).toBeNull();
    }
  });

  it('accepts currentHp up to the max HP implied by upgrades and modules', () => {
    const save = rawSave();
    save.run.upgrades = { hp: 1 };
    save.run.currentHp = 95;
    writeRaw(save);
    expect(readSave()?.run.currentHp).toBe(95);

    save.run.currentHp = 96;
    writeRaw(save);
    expect(readSave()).toBeNull();
  });

  it('validates the weapon list', () => {
    const invalidWeapons: unknown[] = [
      [],
      [null],
      [{ id: 'unknown', level: 1, paid: 0 }],
      [{ id: 'pulseNailer', level: 0, paid: 0 }],
      [{ id: 'pulseNailer', level: 4, paid: 0 }],
      [{ id: 'pulseNailer', level: 1.5, paid: 0 }],
      [{ id: 'pulseNailer', level: 1, paid: -1 }],
      [{ id: 'pulseNailer', level: 1, paid: '28' }],
      [{ id: 'pulseNailer', level: 1 }],
      [
        { id: 'pulseNailer', level: 1, paid: 0 },
        { id: 'pulseNailer', level: 2, paid: 0 },
      ],
      [
        { id: 'pulseNailer', level: 1, paid: 0 },
        { id: 'scatterRivets', level: 1, paid: 0 },
        { id: 'arcHammer', level: 1, paid: 0 },
        { id: 'returnGear', level: 1, paid: 0 },
        { id: 'railSpike', level: 1, paid: 0 },
      ],
    ];

    for (const weapons of invalidWeapons) {
      const save = rawSave();
      save.run.weapons = weapons;
      writeRaw(save);
      expect(readSave(), JSON.stringify(weapons)).toBeNull();
    }
  });

  it('accepts four distinct weapons at levels 1-3', () => {
    const save = rawSave();
    save.run.weapons = [
      { id: 'pulseNailer', level: 3, paid: 28 },
      { id: 'scatterRivets', level: 2, paid: 30 },
      { id: 'arcHammer', level: 1, paid: 34 },
      { id: 'railSpike', level: 1, paid: 36 },
    ];
    writeRaw(save);
    expect(readSave()?.run.weapons).toEqual(save.run.weapons);
  });

  it('validates upgrade stacks and ids', () => {
    const cases: unknown[] = [
      { dmg: 7 },
      { dmg: -1 },
      { dmg: 1.5 },
      { dmg: '1' },
      { unknownUpgrade: 1 },
      [],
      null,
    ];

    for (const upgrades of cases) {
      const save = rawSave();
      save.run.upgrades = upgrades;
      writeRaw(save);
      expect(readSave(), JSON.stringify(upgrades)).toBeNull();
    }
  });

  it('validates module counts and ids', () => {
    const cases: unknown[] = [
      { spareMagazine: 4 },
      { spareMagazine: -1 },
      { spareMagazine: 0.5 },
      { unknownModule: 1 },
      [],
      null,
    ];

    for (const modules of cases) {
      const save = rawSave();
      save.run.modules = modules;
      writeRaw(save);
      expect(readSave(), JSON.stringify(modules)).toBeNull();
    }
  });

  it('validates totals fields', () => {
    const fields = ['kills', 'damage', 'bestHit', 'elapsedSeconds', 'coinsEarned'] as const;

    for (const field of fields) {
      for (const value of [-1, '1', null]) {
        const save = rawSave();
        save.run.totals[field] = value;
        writeRaw(save);
        expect(readSave(), `${field}=${String(value)}`).toBeNull();
      }

      const missing = rawSave();
      delete missing.run.totals[field];
      writeRaw(missing);
      expect(readSave(), `missing ${field}`).toBeNull();
    }

    const noTotals = rawSave();
    delete noTotals.run.totals;
    writeRaw(noTotals);
    expect(readSave()).toBeNull();
  });
});

describe('settings', () => {
  it('defaults to sound and shake enabled', () => {
    expect(readSettings()).toEqual({ sound: true, shake: true });
    expect(readSettings()).not.toBe(readSettings());
  });

  it('writes versioned settings and reads them back', () => {
    const settings: Settings = { sound: false, shake: true };
    writeSettings(settings);

    const stored: StoredSettings = JSON.parse(storage.getItem(SETTINGS_KEY)!);
    expect(stored).toEqual({ version: 1, sound: false, shake: true });
    expect(readSettings()).toEqual(settings);
  });

  it('falls back for invalid settings', () => {
    const invalid: unknown[] = [
      '{bad json',
      'null',
      '[]',
      { version: 2, sound: false, shake: false },
      { version: 1, sound: 'no', shake: false },
      { version: 1, sound: true },
      { sound: false, shake: false },
    ];

    for (const value of invalid) {
      storage.setItem(SETTINGS_KEY, typeof value === 'string' ? value : JSON.stringify(value));
      expect(readSettings()).toEqual({ sound: true, shake: true });
    }
  });

  it('does not use the run save key', () => {
    writeSettings({ sound: false, shake: false });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(SETTINGS_KEY)).not.toBeNull();
  });
});

describe('intro flag', () => {
  it('starts unseen and persists after marking', () => {
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(storage.getItem(INTRO_KEY)).toBe('1');
    expect(hasSeenIntro()).toBe(true);
  });

  it('treats unexpected stored values as unseen', () => {
    for (const value of ['0', 'true', 'yes', '']) {
      storage.setItem(INTRO_KEY, value);
      expect(hasSeenIntro()).toBe(false);
    }
  });
});

describe('missing or blocked localStorage', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('degrades safely when localStorage is absent', () => {
    Reflect.deleteProperty(globalThis, 'localStorage');

    expect(readSave()).toBeNull();
    expect(hasSave()).toBe(false);
    expect(readSettings()).toEqual({ sound: true, shake: true });
    expect(hasSeenIntro()).toBe(false);

    expect(() => writeSave(makeSave())).not.toThrow();
    expect(() => clearSave()).not.toThrow();
    expect(() => writeSettings({ sound: false, shake: false })).not.toThrow();
    expect(() => markIntroSeen()).not.toThrow();
  });

  it('degrades safely when storage throws', () => {
    installStorage(new ThrowingStorage());

    expect(readSave()).toBeNull();
    expect(hasSave()).toBe(false);
    expect(readSettings()).toEqual({ sound: true, shake: true });
    expect(hasSeenIntro()).toBe(false);

    expect(() => writeSave(makeSave())).not.toThrow();
    expect(() => clearSave()).not.toThrow();
    expect(() => writeSettings({ sound: false, shake: false })).not.toThrow();
    expect(() => markIntroSeen()).not.toThrow();
  });
});
