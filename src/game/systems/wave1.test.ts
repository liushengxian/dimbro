import { describe, expect, it } from 'vitest';
import { WAVES_BY_ID } from '../data/waves';
import { createRng } from '../core/rng';
import { createBattle, updateBattle, type BattleInput } from './battle';
import { createRun } from './progression';

function botInput(time: number): BattleInput {
  const phase = Math.floor(time / 1.7) % 4;
  return {
    up: phase === 1 || phase === 2,
    down: phase === 0 || phase === 3,
    left: phase === 1 || phase === 0,
    right: phase === 2 || phase === 3,
  };
}

describe('wave 1 playthrough', () => {
  it('can be cleared by a moving player and produces kills and coins', () => {
    const run = createRun('sunsetNeedle', 20261027);
    const world = createBattle(run, WAVES_BY_ID[1]);
    const rng = createRng(20261027);
    let outcome: string | null = null;

    for (let step = 0; step < 60 * 30; step += 1) {
      const time = step / 60;
      outcome = updateBattle(run, world, WAVES_BY_ID[1], 1 / 60, botInput(time), rng);
      if (outcome !== null) break;
    }

    expect(outcome).toBe('waveClear');
    expect(world.waveStats.kills).toBeGreaterThan(0);
    expect(world.waveStats.pickedCoins + (run.coins - 15)).toBeGreaterThan(0);
    expect(run.currentHp).toBeGreaterThan(0);
  });
});
