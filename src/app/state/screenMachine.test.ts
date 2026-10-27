import { describe, expect, it } from 'vitest';

import {
  initialScreenState,
  screenReducer,
  type Screen,
  type ScreenEvent,
  type ScreenState,
} from './screenMachine';

function run(state: ScreenState, ...events: ScreenEvent[]): ScreenState {
  return events.reduce(screenReducer, state);
}

describe('screenReducer', () => {
  it('starts at home with no previous screen', () => {
    expect(initialScreenState).toEqual({ screen: 'home', previous: null });
  });

  it('walks the full mission chain and tracks previous screens', () => {
    let state = run(initialScreenState, { type: 'START_MISSION' });
    expect(state).toEqual({ screen: 'characterSelect', previous: 'home' });

    state = screenReducer(state, { type: 'START_BATTLE' });
    expect(state).toEqual({ screen: 'battle', previous: 'characterSelect' });

    state = screenReducer(state, { type: 'WAVE_CLEAR' });
    expect(state).toEqual({ screen: 'waveClear', previous: 'battle' });

    state = screenReducer(state, { type: 'BEGIN_UPGRADE' });
    expect(state).toEqual({ screen: 'upgrade', previous: 'waveClear' });

    state = screenReducer(state, { type: 'OPEN_SHOP' });
    expect(state).toEqual({ screen: 'shop', previous: 'upgrade' });

    state = screenReducer(state, { type: 'NEXT_WAVE' });
    expect(state).toEqual({ screen: 'battle', previous: 'shop' });

    state = screenReducer(state, { type: 'SHOW_RESULT' });
    expect(state).toEqual({ screen: 'result', previous: 'battle' });

    state = screenReducer(state, { type: 'PLAY_AGAIN' });
    expect(state).toEqual({ screen: 'characterSelect', previous: 'result' });
  });

  it('continues a saved run from home straight into battle', () => {
    expect(screenReducer(initialScreenState, { type: 'CONTINUE_RUN' })).toEqual({
      screen: 'battle',
      previous: 'home',
    });
  });

  it('can loop through multiple waves', () => {
    let state: ScreenState = { screen: 'battle', previous: 'characterSelect' };
    for (let wave = 0; wave < 3; wave += 1) {
      state = screenReducer(state, { type: 'WAVE_CLEAR' });
      state = screenReducer(state, { type: 'BEGIN_UPGRADE' });
      state = screenReducer(state, { type: 'OPEN_SHOP' });
      state = screenReducer(state, { type: 'NEXT_WAVE' });
    }
    expect(state).toEqual({ screen: 'battle', previous: 'shop' });
  });

  it('returns home from any screen and records where it came from', () => {
    const screens: Screen[] = [
      'characterSelect',
      'battle',
      'waveClear',
      'upgrade',
      'shop',
      'result',
    ];

    for (const screen of screens) {
      expect(screenReducer({ screen, previous: null }, { type: 'BACK_HOME' })).toEqual({
        screen: 'home',
        previous: screen,
      });
    }
  });

  it('treats BACK_HOME on home as a no-op', () => {
    const state: ScreenState = { screen: 'home', previous: 'battle' };
    expect(screenReducer(state, { type: 'BACK_HOME' })).toBe(state);
  });

  it('keeps the same state object for illegal transitions', () => {
    const state: ScreenState = { screen: 'battle', previous: 'characterSelect' };
    const illegal: ScreenEvent[] = [
      { type: 'START_MISSION' },
      { type: 'START_BATTLE' },
      { type: 'CONTINUE_RUN' },
      { type: 'BEGIN_UPGRADE' },
      { type: 'OPEN_SHOP' },
      { type: 'NEXT_WAVE' },
      { type: 'PLAY_AGAIN' },
    ];

    for (const event of illegal) {
      expect(screenReducer(state, event)).toBe(state);
    }
  });

  it.each<[Screen, ScreenEvent]>([
    ['home', { type: 'START_BATTLE' }],
    ['home', { type: 'WAVE_CLEAR' }],
    ['home', { type: 'BEGIN_UPGRADE' }],
    ['home', { type: 'OPEN_SHOP' }],
    ['home', { type: 'NEXT_WAVE' }],
    ['home', { type: 'SHOW_RESULT' }],
    ['home', { type: 'PLAY_AGAIN' }],
    ['characterSelect', { type: 'START_MISSION' }],
    ['characterSelect', { type: 'CONTINUE_RUN' }],
    ['characterSelect', { type: 'WAVE_CLEAR' }],
    ['characterSelect', { type: 'OPEN_SHOP' }],
    ['battle', { type: 'START_MISSION' }],
    ['battle', { type: 'CONTINUE_RUN' }],
    ['waveClear', { type: 'WAVE_CLEAR' }],
    ['waveClear', { type: 'OPEN_SHOP' }],
    ['waveClear', { type: 'SHOW_RESULT' }],
    ['upgrade', { type: 'NEXT_WAVE' }],
    ['shop', { type: 'OPEN_SHOP' }],
    ['shop', { type: 'SHOW_RESULT' }],
    ['result', { type: 'SHOW_RESULT' }],
    ['result', { type: 'NEXT_WAVE' }],
  ])('rejects %s + %j without changing state', (screen, event) => {
    const state: ScreenState = { screen, previous: null };
    expect(screenReducer(state, event)).toBe(state);
  });

  it('does not mutate the input state', () => {
    const state: ScreenState = { screen: 'battle', previous: 'characterSelect' };
    const snapshot = { ...state };
    screenReducer(state, { type: 'WAVE_CLEAR' });
    expect(state).toEqual(snapshot);
  });
});
