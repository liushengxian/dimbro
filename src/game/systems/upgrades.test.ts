import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { UPGRADE_LIST } from '../data/upgrades';
import { BALANCE } from '../data/balance';
import { createRun } from './progression';
import { applyUpgrade, generateUpgradeChoices } from './upgrades';

describe('upgrade choices', () => {
  it('offers three unique upgrades from the available pool', () => {
    const run = createRun('sunsetNeedle', 1);
    const choices = generateUpgradeChoices(run, createRng(2));
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
    expect(choices.every((choice) => choice.type === 'upgrade')).toBe(true);
  });

  it('does not offer maxed cards and fills with repair cards', () => {
    const run = createRun('sunsetNeedle', 1);
    for (const def of UPGRADE_LIST) {
      run.upgrades[def.id] = def.maxStacks;
    }
    const choices = generateUpgradeChoices(run, createRng(3));
    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => choice.type === 'repair')).toBe(true);
  });

  it('applies stacks and heals when max HP increases', () => {
    const run = createRun('sunsetNeedle', 1);
    const beforeHp = run.currentHp;
    applyUpgrade(run, 'hp');
    expect(run.upgrades.hp).toBe(1);
    expect(run.currentHp).toBe(beforeHp + 15);

    for (let index = 1; index < 5; index += 1) applyUpgrade(run, 'hp');
    expect(run.upgrades.hp).toBe(5);
    applyUpgrade(run, 'hp');
    expect(run.upgrades.hp).toBe(5);
    expect(run.currentHp).toBeLessThanOrEqual(65 + 5 * 15);
  });

  it('never offers more than one risk card', () => {
    for (let seed = 0; seed < 80; seed += 1) {
      const choices = generateUpgradeChoices(createRun('sunsetNeedle', 1), createRng(seed));
      expect(choices.filter((choice) => choice.risk).length).toBeLessThanOrEqual(1);
    }
  });

  it('repairs 20% of max HP without exceeding the cap', () => {
    const run = createRun('sunsetNeedle', 1);
    run.currentHp = 1;
    applyUpgrade(run, 'repair');
    expect(run.currentHp).toBe(1 + Math.floor(65 * BALANCE.repairHealPct));
  });
});
