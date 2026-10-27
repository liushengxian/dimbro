/**
 * 可复现的 mulberry32 随机数生成器。
 *
 * 同一个种子在任意机器上产生完全一致的序列；状态可以序列化到存档，
 * 便于在继续任务时恢复随机流。
 */

const UINT32_RANGE = 0x1_0000_0000;

function toUint32(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Rng state must be a finite number, received ${value}`);
  }
  return value >>> 0;
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`Rng seed must be a finite number, received ${seed}`);
  }
  return Math.trunc(seed) >>> 0;
}

export class Rng {
  private state: number;

  constructor(seed: number, state?: number) {
    this.state = state === undefined ? normalizeSeed(seed) : toUint32(state);
  }

  /** 返回 [0, 1) 的浮点数，并推进内部状态。 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  }

  /** 返回 [minInclusive, maxInclusive] 的整数（两端都包含）。 */
  int(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new RangeError('Rng.int requires finite bounds');
    }
    if (min > max) {
      throw new RangeError(`Rng.int: min (${min}) must not exceed max (${max})`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** p <= 0 恒为 false，p >= 1 恒为 true；其余按概率判定。 */
  chance(p: number): boolean {
    if (!Number.isFinite(p) || p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Rng.pick: cannot pick from an empty array');
    }
    return items[this.int(0, items.length - 1)] as T;
  }

  weightedPick<T>(items: readonly { value: T; weight: number }[]): T {
    if (items.length === 0) {
      throw new Error('Rng.weightedPick: cannot pick from an empty array');
    }

    let total = 0;
    for (const item of items) {
      if (!Number.isFinite(item.weight) || item.weight < 0) {
        throw new RangeError(`Rng.weightedPick: invalid weight ${item.weight}`);
      }
      total += item.weight;
    }
    if (total <= 0) {
      throw new Error('Rng.weightedPick: total weight must be greater than 0');
    }

    let roll = this.next() * total;
    for (const item of items) {
      if (item.weight <= 0) continue;
      roll -= item.weight;
      if (roll < 0) return item.value;
    }

    // 浮点误差兜底：返回最后一个正权重项。
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      if (item !== undefined && item.weight > 0) return item.value;
    }
    /* istanbul ignore next -- 上面的校验已保证存在正权重项 */
    throw new Error('Rng.weightedPick: no positive weight found');
  }

  getState(): number {
    return this.state >>> 0;
  }

  setState(state: number): void {
    this.state = toUint32(state);
  }
}

export function createRng(seed: number): Rng {
  return new Rng(seed);
}

/** 兼容直接按函数使用的调用方。 */
export function mulberry32(seed: number): Rng {
  return new Rng(seed);
}
