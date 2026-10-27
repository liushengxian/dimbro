import { BALANCE } from '../data/balance';
import { UPGRADE_LIST, UPGRADES_BY_ID } from '../data/upgrades';
import type { Rng } from '../core/rng';
import type { RunState, UpgradeChoice, UpgradeId } from '../types';
import { applyMaxHpBonus, computePlayerStats } from './progression';

export function generateUpgradeChoices(run: RunState, rng: Rng): UpgradeChoice[] {
  const pool = UPGRADE_LIST.filter(
    (def) => (run.upgrades[def.id] ?? 0) < def.maxStacks,
  );
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }

  const picked = shuffled.slice(0, BALANCE.upgradeOfferCount);
  const choices: UpgradeChoice[] = picked.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    stacks: run.upgrades[def.id] ?? 0,
    maxStacks: def.maxStacks,
    type: 'upgrade',
  }));

  while (choices.length < BALANCE.upgradeOfferCount) {
    choices.push(repairChoice());
  }

  return choices;
}

export function repairChoice(): UpgradeChoice {
  return {
    id: 'repair',
    name: '应急维修',
    description: `回复 ${Math.round(BALANCE.repairHealPct * 100)}% 最大生命。`,
    icon: '✚',
    stacks: 0,
    maxStacks: 1,
    type: 'repair',
  };
}

export function applyUpgrade(run: RunState, id: UpgradeChoice['id']): void {
  if (id === 'repair') {
    const stats = computePlayerStats(run);
    run.currentHp = Math.min(stats.maxHp, run.currentHp + Math.floor(stats.maxHp * BALANCE.repairHealPct));
    return;
  }

  const def = UPGRADES_BY_ID[id as UpgradeId];
  if (!def) return;
  const current = run.upgrades[id] ?? 0;
  if (current >= def.maxStacks) return;

  run.upgrades[id] = current + 1;
  if (def.effect.kind === 'maxHp') {
    applyMaxHpBonus(run, def.effect.heal ?? def.effect.value);
  }
}
