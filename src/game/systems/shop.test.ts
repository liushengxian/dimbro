import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { BALANCE } from '../data/balance';
import { WEAPONS_BY_ID, weaponColorForLevel } from '../data/weapons';
import { createRun } from './progression';
import {
  buildShopView,
  generateShopOffers,
  nextRefreshCost,
  weaponSellRefund,
} from './shop';

describe('shop generation', () => {
  it('guarantees a weapon while slots are open and never duplicates an offer', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const run = createRun('sunsetNeedle', seed);
      const offers = generateShopOffers(run, createRng(seed));
      expect(offers).toHaveLength(BALANCE.shopOfferCount);
      expect(offers.some((offer) => offer.kind === 'weapon')).toBe(true);
      const keys = offers.map((offer) => `${offer.kind}:${offer.refId}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('prices owned weapon upgrades at 80 percent', () => {
    const run = createRun('sunsetNeedle', 1);
    for (let seed = 1; seed <= 30; seed += 1) {
      const offers = generateShopOffers(run, createRng(seed));
      const upgrade = offers.find(
        (offer) => offer.kind === 'weapon' && offer.refId === 'pulseNailer',
      );
      if (upgrade) {
        expect(upgrade.level).toBe(2);
        expect(upgrade.price).toBe(Math.floor(WEAPONS_BY_ID.pulseNailer.price * 0.8));
        break;
      }
    }
  });

  it('still offers unowned weapons when all four slots are occupied', () => {
    const run = createRun('sunsetNeedle', 1);
    run.weapons.push(
      { id: 'arcHammer', level: 1, paid: 34 },
      { id: 'returnGear', level: 1, paid: 32 },
      { id: 'railSpike', level: 1, paid: 36 },
    );
    expect(run.weapons).toHaveLength(4);

    const offers = generateShopOffers(run, createRng(4));
    const newWeapon = offers.find(
      (offer) =>
        offer.kind === 'weapon' &&
        !run.weapons.some((weapon) => weapon.id === offer.refId),
    );
    // 五把武器中恰好还剩一把未拥有；具体是否出现在这一轮取决于权重，
    // 多刷几次应能出现。
    let found = Boolean(newWeapon);
    for (let seed = 5; seed <= 60 && !found; seed += 1) {
      const attempt = generateShopOffers(run, createRng(seed));
      found = attempt.some(
        (offer) =>
          offer.kind === 'weapon' &&
          !run.weapons.some((weapon) => weapon.id === offer.refId),
      );
    }
    expect(found).toBe(true);
  });

  it('calculates refunds and refresh costs', () => {
    expect(weaponSellRefund({ id: 'pulseNailer', level: 1, paid: 28 })).toBe(14);
    expect(weaponSellRefund({ id: 'pulseNailer', level: 2, paid: 43 })).toBe(21);
    expect(nextRefreshCost(5)).toBe(9);
    expect(nextRefreshCost(9)).toBe(13);
  });

  it('previews the purchased tier color on weapon offers', () => {
    const run = createRun('sunsetNeedle', 1);
    const view = buildShopView(
      run,
      [
        {
          id: 'offer-0-weapon-pulseNailer',
          kind: 'weapon',
          refId: 'pulseNailer',
          price: 22,
          sold: false,
          level: 2,
        },
        {
          id: 'offer-1-weapon-railSpike',
          kind: 'weapon',
          refId: 'railSpike',
          price: 36,
          sold: false,
          level: 1,
        },
      ],
      5,
      null,
    );

    expect(view.offers[0]?.color).toBe(
      weaponColorForLevel(WEAPONS_BY_ID.pulseNailer, 2),
    );
    expect(view.offers[1]?.color).toBe(WEAPONS_BY_ID.railSpike.color);
  });
});
