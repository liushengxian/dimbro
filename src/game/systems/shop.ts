import { BALANCE } from '../data/balance';
import { MODULE_LIST, MODULES_BY_ID } from '../data/modules';
import { WEAPON_LIST, WEAPONS_BY_ID, weaponColorForLevel } from '../data/weapons';
import type {
  ModuleId,
  RunState,
  ShopOfferView,
  ShopView,
  WeaponId,
  WeaponInstance,
} from '../types';
import type { Rng } from '../core/rng';

export interface InternalShopOffer {
  id: string;
  kind: 'weapon' | 'module';
  refId: WeaponId | ModuleId;
  price: number;
  sold: boolean;
  level?: number;
}

interface Candidate {
  kind: 'weapon' | 'module';
  refId: WeaponId | ModuleId;
  price: number;
  level?: number;
}

export function generateShopOffers(run: RunState, rng: Rng): InternalShopOffer[] {
  const weaponCandidates: Candidate[] = [];
  for (const def of WEAPON_LIST) {
    const owned = run.weapons.find((weapon) => weapon.id === def.id);
    if (owned) {
      if (owned.level >= BALANCE.maxWeaponLevel) continue;
      weaponCandidates.push({
        kind: 'weapon',
        refId: def.id,
        price: Math.floor(def.price * BALANCE.weaponUpgradeDiscount),
        level: owned.level + 1,
      });
    } else {
      // 满槽时也保留新武器商品，购买后进入“替换槽位”流程。
      weaponCandidates.push({
        kind: 'weapon',
        refId: def.id,
        price: def.price,
        level: 1,
      });
    }
  }

  const moduleCandidates: Candidate[] = MODULE_LIST.filter(
    (def) => (run.modules[def.id] ?? 0) < BALANCE.moduleMaxStacks,
  ).map((def) => ({
    kind: 'module',
    refId: def.id,
    price: def.price,
  }));

  const offers: InternalShopOffer[] = [];
  const usedWeapons = new Set<WeaponId>();
  const usedModules = new Set<ModuleId>();

  const takeWeapon = (): Candidate | null => {
    const available = weaponCandidates.filter(
      (candidate) =>
        candidate.kind === 'weapon' && !usedWeapons.has(candidate.refId as WeaponId),
    );
    if (available.length === 0) return null;
    const picked = rng.pick(available);
    usedWeapons.add(picked.refId as WeaponId);
    return picked;
  };

  const takeModule = (): Candidate | null => {
    const available = moduleCandidates.filter(
      (candidate) =>
        candidate.kind === 'module' && !usedModules.has(candidate.refId as ModuleId),
    );
    if (available.length === 0) return null;
    const picked = rng.pick(available);
    usedModules.add(picked.refId as ModuleId);
    return picked;
  };

  // 近满槽时，文档要求至少保留一个武器商品；这里优先保证。
  if (run.weapons.length < BALANCE.maxWeapons) {
    const guaranteed = takeWeapon();
    if (guaranteed) offers.push(toOffer(guaranteed, offers.length));
  }

  while (offers.length < BALANCE.shopOfferCount) {
    const wantWeapon = rng.chance(BALANCE.shopWeaponWeight);
    let candidate = wantWeapon ? takeWeapon() : takeModule();
    if (!candidate) candidate = wantWeapon ? takeModule() : takeWeapon();
    if (!candidate) break;
    offers.push(toOffer(candidate, offers.length));
  }

  return offers;
}

function toOffer(candidate: Candidate, index: number): InternalShopOffer {
  return {
    id: `offer-${index}-${candidate.kind}-${candidate.refId}`,
    kind: candidate.kind,
    refId: candidate.refId,
    price: candidate.price,
    sold: false,
    level: candidate.level,
  };
}

export function buildShopView(
  run: RunState,
  offers: readonly InternalShopOffer[],
  refreshCost: number,
  pendingOfferId: string | null,
): ShopView {
  return {
    offers: offers.map((offer) => toOfferView(run, offer)),
    refreshCost,
    pendingOfferId,
    moduleSummary: MODULE_LIST.filter((def) => (run.modules[def.id] ?? 0) > 0).map((def) => ({
      id: def.id,
      name: def.name,
      count: run.modules[def.id] ?? 0,
    })),
  };
}

function toOfferView(run: RunState, offer: InternalShopOffer): ShopOfferView {
  if (offer.kind === 'weapon') {
    const def = WEAPONS_BY_ID[offer.refId as WeaponId];
    const owned = run.weapons.find((weapon) => weapon.id === offer.refId);
    const isUpgrade = Boolean(owned);
    return {
      id: offer.id,
      kind: 'weapon',
      refId: offer.refId,
      name: def.name,
      description: def.description,
      price: offer.price,
      sold: offer.sold,
      canAfford: !offer.sold && run.coins >= offer.price,
      icon: def.icon,
      level: offer.level,
      color: weaponColorForLevel(def, offer.level ?? owned?.level ?? 1),
      detail: isUpgrade
        ? `升级至 Lv.${offer.level} · 伤害 +25% / 冷却 -6%`
        : `${def.role} · 伤害 ${def.baseDamage} · 冷却 ${def.cooldown}s`,
    };
  }

  const def = MODULES_BY_ID[offer.refId as ModuleId];
  const count = run.modules[def.id] ?? 0;
  return {
    id: offer.id,
    kind: 'module',
    refId: offer.refId,
    name: def.name,
    description: def.description,
    price: offer.price,
    sold: offer.sold,
    canAfford: !offer.sold && run.coins >= offer.price,
    icon: def.icon,
    detail: `被动模块 · 持有 ${count}/${def.maxStacks}`,
  };
}

export function weaponSellRefund(weapon: WeaponInstance): number {
  return Math.floor(weapon.paid * BALANCE.weaponSellRefundPct);
}

export function nextRefreshCost(current: number): number {
  return current + BALANCE.shopRefreshStep;
}
