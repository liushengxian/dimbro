import { afterEach, describe, expect, it } from 'vitest';
import { readSave, SAVE_KEY } from '../app/lib/storage';
import { WEAPONS_BY_ID, weaponColorForLevel } from './data/weapons';
import { GameSession } from './session';
import type { BattleWorld, PickupEntity } from './types';

interface SessionInternals {
  world: BattleWorld;
  run: NonNullable<ReturnType<GameSession['getSnapshot']>['run']>;
  step(dt: number): void;
  publish(): void;
  startBattle(): void;
}

function internals(session: GameSession): SessionInternals {
  return session as unknown as SessionInternals;
}

function pickup(id: number, value: number): PickupEntity {
  return {
    id,
    x: 100,
    y: 100,
    value,
    radius: 5,
    vx: 0,
    vy: 0,
    magnet: false,
    dead: false,
  };
}

function installMemoryStorage(): void {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    get length() {
      return values.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

function reachShop(session: GameSession): void {
  session.startNewRun('sunsetNeedle');
  session.debugFinishWave();
  internals(session).step(1 / 60);
  session.beginUpgrade();
  const choice = session.getSnapshot().upgradeChoices[0];
  if (!choice) throw new Error('no upgrade choice');
  session.chooseUpgrade(choice.id);
}

describe('GameSession wave settlement', () => {
  it('bags unpicked coins for non-Simon characters', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    state.run.coins = 20;
    state.world.waveStats.pickedCoins = 5;
    state.world.pickups = [pickup(1, 16)];
    state.world.timeLeft = 0.01;
    state.step(1 / 60);

    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('waveClear');
    expect(snapshot.waveSummary?.baggedCoins).toBe(16);
    expect(snapshot.waveSummary?.baggedTotal).toBe(16);
    expect(snapshot.waveSummary?.bossBagRecovered).toBe(0);
    expect(snapshot.waveSummary?.simonRepairCoins).toBe(0);
    expect(snapshot.coins).toBe(30);
    expect(snapshot.run?.baggedCoins).toBe(16);
    expect(snapshot.run?.shields).toBe(0);
  });

  it('redeems one bagged coin per pickup', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    state.run.baggedCoins = 2;
    const coin = pickup(1, 1);
    coin.x = state.world.player.x;
    coin.y = state.world.player.y;
    state.world.pickups = [coin];
    state.step(1 / 60);

    const snapshot = session.getSnapshot();
    expect(snapshot.coins).toBe(17);
    expect(snapshot.baggedCoins).toBe(1);
    expect(state.world.waveStats.pickedCoins).toBe(2);
  });

  it('keeps the bag through upgrade and shop', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    state.run.baggedCoins = 7;
    session.debugFinishWave();
    state.step(1 / 60);
    session.beginUpgrade();
    const choice = session.getSnapshot().upgradeChoices[0];
    if (!choice) throw new Error('no upgrade choice');
    session.chooseUpgrade(choice.id);
    session.nextWave();

    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('battle');
    expect(snapshot.wave).toBe(2);
    expect(snapshot.baggedCoins).toBe(7);
  });

  it('recovers the bag before the boss wave', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    state.run.wave = 7;
    state.startBattle();
    state.run.baggedCoins = 9;
    state.world.pickups = [pickup(1, 6)];
    state.world.timeLeft = 0.01;
    state.step(1 / 60);

    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('waveClear');
    expect(snapshot.waveSummary?.baggedCoins).toBe(6);
    expect(snapshot.waveSummary?.baggedTotal).toBe(0);
    expect(snapshot.waveSummary?.bossBagRecovered).toBe(15);
    expect(snapshot.run?.baggedCoins).toBe(0);
    expect(snapshot.coins).toBe(52);
  });

  it('auto-collects for Simon and grants one repair shield per 15 coins', () => {
    const session = new GameSession();
    session.startNewRun('simon');
    const state = internals(session);
    state.run.coins = 20;
    state.world.waveStats.pickedCoins = 5;
    state.world.pickups = [pickup(1, 16)];
    state.world.timeLeft = 0.01;
    state.step(1 / 60);

    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('waveClear');
    expect(snapshot.waveSummary?.simonRepairCoins).toBe(16);
    expect(snapshot.waveSummary?.baggedCoins).toBe(0);
    expect(snapshot.waveSummary?.baggedTotal).toBe(0);
    expect(snapshot.waveSummary?.bossBagRecovered).toBe(0);
    expect(snapshot.waveSummary?.shieldsGained).toBe(1);
    expect(snapshot.run?.shields).toBe(1);
    expect(snapshot.coins).toBe(46);
  });

  it('enters upgrade, then shop, and can buy an affordable module', () => {
    const session = new GameSession();
    reachShop(session);
    expect(session.getSnapshot().phase).toBe('shop');
    session.debugAddCoins(500);

    let result = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const shop = session.getSnapshot().shop;
      const moduleOffer = shop?.offers.find(
        (offer) => offer.kind === 'module' && !offer.sold && offer.canAfford,
      );
      if (moduleOffer) {
        result = session.buyOffer(moduleOffer.id);
        break;
      }
      const refresh = session.refreshShop();
      if (refresh.status !== 'ok') break;
    }

    expect(result?.status).toBe('ok');
    const snapshot = session.getSnapshot();
    const totalModules = Object.values(snapshot.run?.modules ?? {}).reduce(
      (sum, count) => sum + (count ?? 0),
      0,
    );
    expect(totalModules).toBe(1);
  });

  it('exposes the upgraded weapon color to the battle HUD', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    const weapon = state.run.weapons[0];
    if (!weapon) throw new Error('missing starting weapon');
    weapon.level = 2;
    state.publish();

    const hudWeapon = session.getSnapshot().weapons[0];
    expect(hudWeapon?.level).toBe(2);
    expect(hudWeapon?.color).toBe(
      weaponColorForLevel(WEAPONS_BY_ID.pulseNailer, 2),
    );
  });

  it('can start and finish a boss wave through the session facade', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    session.debugJumpToWave(8);
    expect(session.getSnapshot().bossWave).toBe(true);
    session.debugFinishWave();
    const state = internals(session);
    for (let step = 0; step < 20; step += 1) {
      state.step(1 / 60);
    }
    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('victory');
    expect(snapshot.result?.victory).toBe(true);
    expect(snapshot.result?.wave).toBe(8);
  });

  it('produces a defeat result when player health reaches zero', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');
    const state = internals(session);
    state.world.player.hp = 0;
    state.step(1 / 60);
    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('defeat');
    expect(snapshot.result?.victory).toBe(false);
    expect(snapshot.result?.remainingHp).toBe(0);
  });

  it('writes a save at wave start and restores it through continueRun', () => {
    installMemoryStorage();
    const session = new GameSession();
    session.startNewRun('simon');
    const save = readSave();
    expect(save).not.toBeNull();
    expect(globalThis.localStorage.getItem(SAVE_KEY)).not.toBeNull();

    const restored = new GameSession();
    restored.continueRun(save!);
    const snapshot = restored.getSnapshot();
    expect(snapshot.phase).toBe('battle');
    expect(snapshot.run?.characterId).toBe('simon');
    expect(snapshot.wave).toBe(1);
  });
});

describe('GameSession audio cues', () => {
  it('forwards wave and pause events to the audio listener', () => {
    const session = new GameSession();
    const cues: string[] = [];
    session.setAudioListener((cue) => cues.push(cue));

    session.startNewRun('sunsetNeedle');
    expect(cues).toContain('waveStart');

    session.pause();
    expect(cues).toContain('pause');

    session.resume();
    expect(cues).toContain('resume');
  });
});
