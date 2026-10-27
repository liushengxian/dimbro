import { describe, expect, it } from 'vitest';
import { GameSession } from './session';
import type { BattleWorld, RunState } from './types';

interface Internals {
  world: BattleWorld;
  run: RunState;
  input: { up: boolean; down: boolean; left: boolean; right: boolean };
  step(dt: number): void;
}

function state(session: GameSession): Internals {
  return session as unknown as Internals;
}

function botInput(time: number): Internals['input'] {
  const phase = Math.floor(time / 2.3) % 4;
  return {
    up: phase === 1 || phase === 2,
    down: phase === 0 || phase === 3,
    left: phase === 1 || phase === 0,
    right: phase === 2 || phase === 3,
  };
}

function buyWeapons(session: GameSession): void {
  session.debugAddCoins(5000);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const snapshot = session.getSnapshot();
    if (!snapshot.shop || !snapshot.run) return;
    if (snapshot.run.weapons.length >= 4) return;
    const offer = snapshot.shop.offers.find(
      (item) => item.kind === 'weapon' && !item.sold && item.level === 1,
    );
    if (offer) {
      session.buyOffer(offer.id);
    } else {
      const result = session.refreshShop();
      if (result.status !== 'ok') return;
    }
  }
}

describe('full demo simulation', () => {
  it('runs all eight waves, shops, boss phase two, soft enrage, and victory', () => {
    const session = new GameSession();
    session.startNewRun('sunsetNeedle');

    for (let wave = 1; wave <= 7; wave += 1) {
      expect(session.getSnapshot().phase).toBe('battle');
      const internal = state(session);
      const limit = (internal.world.duration ?? 60) * 60 + 120;
      for (let step = 0; step < limit; step += 1) {
        internal.world.player.iframes = 999;
        internal.input = botInput(step / 60);
        internal.step(1 / 60);
        if (session.getSnapshot().phase !== 'battle') break;
      }
      expect(session.getSnapshot().phase).toBe('waveClear');

      session.beginUpgrade();
      const choice = session.getSnapshot().upgradeChoices[0];
      expect(choice).toBeDefined();
      session.chooseUpgrade(choice?.id ?? 'repair');
      expect(session.getSnapshot().phase).toBe('shop');
      buyWeapons(session);
      session.nextWave();
    }

    expect(session.getSnapshot().wave).toBe(8);
    expect(session.getSnapshot().bossWave).toBe(true);

    const bossBattle = state(session);
    for (let step = 0; step < 60 * 5; step += 1) {
      bossBattle.world.player.iframes = 999;
      bossBattle.input = botInput(step / 60);
      bossBattle.step(1 / 60);
    }
    session.debugSetBossHp(0.49);
    for (let step = 0; step < 60 * 5; step += 1) {
      bossBattle.world.player.iframes = 999;
      bossBattle.input = botInput(step / 60);
      bossBattle.step(1 / 60);
    }
    expect(session.getSnapshot().boss?.phase).toBe(2);
    session.debugSetBossElapsed(61);
    for (let step = 0; step < 60 * 2; step += 1) {
      bossBattle.world.player.iframes = 999;
      bossBattle.step(1 / 60);
    }
    expect(session.getSnapshot().boss?.enraged).toBe(true);

    session.debugFinishWave();
    for (let step = 0; step < 60 * 3; step += 1) {
      bossBattle.step(1 / 60);
      if (session.getSnapshot().phase === 'victory') break;
    }
    const snapshot = session.getSnapshot();
    expect(snapshot.phase).toBe('victory');
    expect(snapshot.result?.victory).toBe(true);
    expect(snapshot.result?.wave).toBe(8);
  }, 30000);
});
