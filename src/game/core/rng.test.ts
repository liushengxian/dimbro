import { describe, expect, it } from 'vitest';

import { createRng, mulberry32, Rng } from './rng';

function sequence(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sequence(createRng(12345), 20)).toEqual(sequence(createRng(12345), 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(sequence(createRng(1), 8)).not.toEqual(sequence(createRng(2), 8));
  });

  it('exposes the same generator through mulberry32', () => {
    expect(mulberry32(999)).toBeInstanceOf(Rng);
    expect(sequence(mulberry32(999), 5)).toEqual(sequence(createRng(999), 5));
  });

  it('returns floats in [0, 1) and eventually varies', () => {
    const rng = createRng(42);
    const values = sequence(rng, 500);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values).size).toBeGreaterThan(400);
  });

  it('restores the exact random stream from getState/setState', () => {
    const rng = createRng(2024);
    sequence(rng, 7);
    const state = rng.getState();
    const expected = sequence(rng, 10);

    rng.setState(state);
    expect(sequence(rng, 10)).toEqual(expected);

    const restored = new Rng(0, state);
    expect(sequence(restored, 10)).toEqual(expected);
  });

  it('keeps state as an unsigned 32-bit integer', () => {
    const rng = createRng(-1);
    expect(rng.getState()).toBeGreaterThanOrEqual(0);
    expect(rng.getState()).toBeLessThanOrEqual(0xffff_ffff);
    sequence(rng, 100);
    expect(Number.isInteger(rng.getState())).toBe(true);
    expect(rng.getState()).toBeGreaterThanOrEqual(0);
    expect(rng.getState()).toBeLessThanOrEqual(0xffff_ffff);
  });

  it('throws for non-finite seeds', () => {
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
    expect(() => createRng(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('returns inclusive integer bounds', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.int(3, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6]));
  });

  it('handles single-value integer ranges', () => {
    const rng = createRng(1);
    expect(rng.int(5, 5)).toBe(5);
    expect(rng.int(-2, -2)).toBe(-2);
  });

  it('throws for inverted integer ranges', () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 4)).toThrow(RangeError);
    expect(() => rng.int(0, Number.NaN)).toThrow(RangeError);
  });

  it('treats chance(0) and chance(1) as constants', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(-1)).toBe(false);
      expect(rng.chance(1)).toBe(true);
      expect(rng.chance(2)).toBe(true);
    }
  });

  it('approximates the requested probability', () => {
    const rng = createRng(123);
    let hits = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (rng.chance(0.25)) hits += 1;
    }
    expect(hits).toBeGreaterThan(2300);
    expect(hits).toBeLessThan(2700);
  });

  it('picks from arrays deterministically and rejects empty arrays', () => {
    const items = ['a', 'b', 'c', 'd'] as const;
    expect(sequence(createRng(77), 0)).toEqual([]);

    const first = createRng(88).pick(items);
    expect(items).toContain(first);
    expect(createRng(88).pick(items)).toBe(first);

    const rng = createRng(9);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(rng.pick(items));
    expect(seen.size).toBe(4);

    expect(() => rng.pick([])).toThrow(Error);
  });

  it('weightedPick respects weights and skips zero-weight entries', () => {
    const rng = createRng(31);
    const entries = [
      { value: 'common', weight: 3 },
      { value: 'rare', weight: 1 },
      { value: 'never', weight: 0 },
    ];

    let common = 0;
    let rare = 0;
    for (let i = 0; i < 4000; i += 1) {
      const picked = rng.weightedPick(entries);
      if (picked === 'common') common += 1;
      else if (picked === 'rare') rare += 1;
      expect(picked).not.toBe('never');
    }

    expect(common).toBeGreaterThan(rare);
    expect(rare).toBeGreaterThan(0);
  });

  it('weightedPick handles a single positive entry', () => {
    const rng = createRng(5);
    expect(
      rng.weightedPick([
        { value: 1, weight: 0 },
        { value: 2, weight: 10 },
      ]),
    ).toBe(2);
  });

  it('weightedPick rejects empty, all-zero and negative weights', () => {
    const rng = createRng(5);
    expect(() => rng.weightedPick([])).toThrow(Error);
    expect(() =>
      rng.weightedPick([
        { value: 'a', weight: 0 },
        { value: 'b', weight: 0 },
      ]),
    ).toThrow(Error);
    expect(() => rng.weightedPick([{ value: 'a', weight: -1 }])).toThrow(RangeError);
    expect(() => rng.weightedPick([{ value: 'a', weight: Number.NaN }])).toThrow(RangeError);
  });
});
