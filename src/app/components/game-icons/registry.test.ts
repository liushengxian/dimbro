import { describe, expect, it } from 'vitest';
import { MODULE_LIST } from '../../../game/data/modules';
import { UPGRADE_LIST } from '../../../game/data/upgrades';
import { WEAPON_LIST } from '../../../game/data/weapons';
import { GAME_ICONS } from './registry';

const ITEM_ICON_IDS = [
  ...WEAPON_LIST.map((item) => item.id),
  ...MODULE_LIST.map((item) => item.id),
  ...UPGRADE_LIST.map((item) => item.id),
  'repair',
] as const;

describe('game icon registry', () => {
  it('covers every weapon, module, upgrade and the repair card', () => {
    for (const id of ITEM_ICON_IDS) {
      expect(GAME_ICONS, `missing icon: ${id}`).toHaveProperty(id);
    }
  });

  it('does not ship empty groups or duplicate ids', () => {
    const keys = Object.keys(GAME_ICONS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(ITEM_ICON_IDS.length);

    for (const [id, definition] of Object.entries(GAME_ICONS)) {
      expect(definition.content, `empty icon: ${id}`).toBeTruthy();
    }
  });
});
