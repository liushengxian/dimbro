import { MODULE_ICONS_A } from './modules-a';
import { MODULE_ICONS_B } from './modules-b';
import { MODULE_ICONS_C } from './modules-c';
import { RISK_ICONS_A } from './risk-a';
import { RISK_ICONS_B } from './risk-b';
import { STAT_ICONS_A } from './stats-a';
import { STAT_ICONS_B } from './stats-b';
import { STAT_ICONS_C } from './stats-c';
import { WEAPON_ICONS_A } from './weapons-a';
import { WEAPON_ICONS_B } from './weapons-b';

export const GAME_ICONS = {
  ...WEAPON_ICONS_A,
  ...WEAPON_ICONS_B,
  ...STAT_ICONS_A,
  ...STAT_ICONS_B,
  ...STAT_ICONS_C,
  ...MODULE_ICONS_A,
  ...MODULE_ICONS_B,
  ...MODULE_ICONS_C,
  ...RISK_ICONS_A,
  ...RISK_ICONS_B,
};

export type GameIconId = keyof typeof GAME_ICONS;
