/**
 * 顶部页面状态机：只负责「当前在哪个屏幕」，不持有 Run / 战斗状态。
 *
 * 主链：
 *   home -> characterSelect -> battle -> waveClear -> upgrade -> shop -> battle ...
 *   battle -> result -> characterSelect（再来一局）
 * 任意屏幕都可以通过 BACK_HOME 回到首页。
 */

export type Screen =
  | 'home'
  | 'characterSelect'
  | 'battle'
  | 'waveClear'
  | 'upgrade'
  | 'shop'
  | 'result';

export interface ScreenState {
  screen: Screen;
  previous: Screen | null;
}

export type ScreenEvent =
  | { type: 'START_MISSION' }
  | { type: 'BACK_HOME' }
  | { type: 'START_BATTLE' }
  | { type: 'CONTINUE_RUN' }
  | { type: 'WAVE_CLEAR' }
  | { type: 'BEGIN_UPGRADE' }
  | { type: 'OPEN_SHOP' }
  | { type: 'NEXT_WAVE' }
  | { type: 'SHOW_RESULT' }
  | { type: 'PLAY_AGAIN' };

export const initialScreenState: ScreenState = { screen: 'home', previous: null };

const TRANSITIONS: Partial<Record<ScreenEvent['type'], Partial<Record<Screen, Screen>>>> = {
  START_MISSION: { home: 'characterSelect' },
  START_BATTLE: { characterSelect: 'battle', result: 'battle' },
  CONTINUE_RUN: { home: 'battle' },
  WAVE_CLEAR: { battle: 'waveClear' },
  BEGIN_UPGRADE: { waveClear: 'upgrade' },
  OPEN_SHOP: { upgrade: 'shop' },
  NEXT_WAVE: { shop: 'battle' },
  SHOW_RESULT: { battle: 'result' },
  PLAY_AGAIN: { result: 'characterSelect' },
};

export function screenReducer(state: ScreenState, event: ScreenEvent): ScreenState {
  if (event.type === 'BACK_HOME') {
    if (state.screen === 'home') return state;
    return { screen: 'home', previous: state.screen };
  }

  const next = TRANSITIONS[event.type]?.[state.screen];
  if (next === undefined) return state;

  return { screen: next, previous: state.screen };
}
