import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { WEAPONS_BY_ID } from '../../game/data/weapons';
import type { PurchaseResult, SessionSnapshot, ShopOfferView } from '../../game/types';
import { cn } from '../lib/cn';
import '../../styles/shop.css';

export interface ShopScreenProps {
  snapshot: SessionSnapshot;
  onBuy: (offerId: string) => PurchaseResult;
  onRefresh: () => PurchaseResult;
  onSell: (slotIndex: number) => PurchaseResult;
  onReplace: (slotIndex: number) => void;
  onCancelPending: () => void;
  onNextWave: () => void;
}

interface ToastState {
  message: string;
}

function sellRefund(paid: number): number {
  return Math.floor(paid * 0.5);
}

export function ShopScreen({
  snapshot,
  onBuy,
  onRefresh,
  onSell,
  onReplace,
  onCancelPending,
  onNextWave,
}: ShopScreenProps): JSX.Element | null {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sellIndex, setSellIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const shop = snapshot.shop;
  const run = snapshot.run;
  if (!shop || !run) return null;

  const pendingOffer = shop.pendingOfferId
    ? shop.offers.find((offer) => offer.id === shop.pendingOfferId) ?? null
    : null;
  const replaceOpen = shop.pendingOfferId !== null;
  const canSellAny = run.weapons.length > 1;
  const sellWeapon = sellIndex !== null ? run.weapons[sellIndex] ?? null : null;
  const sellDef = sellWeapon ? WEAPONS_BY_ID[sellWeapon.id] : null;
  const offerSlots: Array<ShopOfferView | null> = Array.from(
    { length: 4 },
    (_, index) => shop.offers[index] ?? null,
  );

  function showError(message: string): void {
    setToast({ message });
  }

  function handleBuy(offerId: string): void {
    const result = onBuy(offerId);
    if (result.status === 'error') {
      showError(result.message);
    } else {
      setToast(null);
    }
  }

  function handleRefresh(): void {
    const result = onRefresh();
    if (result.status === 'error') {
      showError(result.message);
    } else {
      setToast(null);
    }
  }

  function handleSellConfirm(): void {
    if (sellIndex === null) return;
    const result = onSell(sellIndex);
    setSellIndex(null);
    if (result.status === 'error') {
      showError(result.message);
    }
  }

  return (
    <main className="shop-screen" aria-labelledby="shop-title">
      <div className="shop-screen__grid" aria-hidden="true" />
      <div className="shop-screen__scanlines" aria-hidden="true" />

      <div className="shop-screen__frame">
        <header className="shop-screen__header">
          <div className="shop-screen__heading">
            <p className="eyebrow">
              BETWEEN WAVES // WAVE {String(snapshot.wave).padStart(2, '0')} CLEAR
            </p>
            <h1 id="shop-title" className="shop-screen__title">
              波间整备
            </h1>
          </div>

          <div className="shop-screen__header-stats">
            <span className="shop-screen__stat shop-screen__stat--coins">
              <Icon name="coin" size={17} />
              <strong>{snapshot.coins}</strong>
              <span>金币</span>
            </span>
            <span className="shop-screen__stat">
              <span className="shop-screen__stat-label">当前波次</span>
              <strong>{String(snapshot.wave).padStart(2, '0')}</strong>
            </span>
            <Button
              variant="primary"
              onClick={onNextWave}
              trailingIcon={<Icon name="arrow-right" size={16} />}
            >
              进入下一波
            </Button>
          </div>
        </header>

        <section className="shop-screen__stock" aria-labelledby="shop-stock-title">
          <div className="shop-screen__section-head">
            <h2 id="shop-stock-title" className="shop-screen__section-title">
              <span aria-hidden="true">▚</span>
              本波货架
            </h2>
            <p className="shop-screen__section-note">
              每件商品限购一次 · 武器重复购买可升级至 Lv.3
            </p>
          </div>

          <div className="shop-screen__offers">
            {offerSlots.map((offer, index) => {
              if (!offer) {
                return (
                  <div key={`empty-${index}`} className="shop-offer shop-offer--empty">
                    <span className="shop-offer__empty-code">EMPTY SLOT</span>
                    <span className="shop-offer__empty-line" aria-hidden="true" />
                    <span>货架空缺</span>
                  </div>
                );
              }

              const sold = offer.sold;
              const affordable = offer.canAfford;
              const disabled = sold || !affordable;
              const stateLabel = sold ? '已售罄' : '买';

              return (
                <button
                  key={offer.id}
                  type="button"
                  className="shop-offer"
                  data-kind={offer.kind}
                  data-sold={sold || undefined}
                  data-affordable={affordable ? 'true' : 'false'}
                  disabled={disabled}
                  aria-label={`${offer.kind === 'weapon' ? '武器' : '模块'} ${offer.name}，${
                    offer.price
                  } 金币，${sold ? '已售罄' : affordable ? '可购买' : '金币不足'}`}
                  title={!sold && !affordable ? '金币不足' : undefined}
                  onClick={() => handleBuy(offer.id)}
                >
                  <span className="shop-offer__top">
                    <span className="shop-offer__kind">
                      {offer.kind === 'weapon' ? '武器' : '模块'}
                    </span>
                    <span className="shop-offer__icon" aria-hidden="true">
                      {offer.icon}
                    </span>
                  </span>

                  <span className="shop-offer__name-row">
                    <span className="shop-offer__name">{offer.name}</span>
                    {offer.kind === 'weapon' && offer.level ? (
                      <span className="shop-offer__level">Lv.{offer.level}</span>
                    ) : null}
                  </span>

                  <span className="shop-offer__description">{offer.description}</span>
                  <span className="shop-offer__detail">{offer.detail}</span>

                  <span className="shop-offer__footer">
                    <span className="shop-offer__price">
                      <span aria-hidden="true">◉</span>
                      {offer.price}
                    </span>
                    <span className="shop-offer__action" data-sold={sold || undefined}>
                      {stateLabel}
                      {sold ? null : <Icon name="chevron-right" size={13} />}
                    </span>
                  </span>

                  {sold ? (
                    <span className="shop-offer__sold-stamp" aria-hidden="true">
                      SOLD
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <div className="shop-screen__lower">
          <section className="shop-screen__equipment" aria-labelledby="shop-equipment-title">
            <div className="shop-screen__section-head shop-screen__section-head--compact">
              <h2 id="shop-equipment-title" className="shop-screen__section-title">
                <span aria-hidden="true">▤</span>
                装备栏
                <em>{run.weapons.length}/4</em>
              </h2>
              <p className="shop-screen__section-note">出售返还购入价 50% · 至少保留 1 把武器</p>
            </div>

            <div className="shop-screen__slots">
              {Array.from({ length: 4 }, (_, index) => {
                const weapon = run.weapons[index];
                if (!weapon) {
                  return (
                    <div key={`slot-${index}`} className="shop-slot shop-slot--empty">
                      <span className="shop-slot__index">SLOT 0{index + 1}</span>
                      <span className="shop-slot__empty">空槽</span>
                      <span className="shop-slot__empty-note">购买武器后自动装配</span>
                    </div>
                  );
                }

                const def = WEAPONS_BY_ID[weapon.id];
                const refund = sellRefund(weapon.paid);

                return (
                  <div key={`${weapon.id}-${index}`} className="shop-slot">
                    <span className="shop-slot__index">SLOT 0{index + 1}</span>
                    <span className="shop-slot__glyph" aria-hidden="true">
                      {def.icon}
                    </span>
                    <span className="shop-slot__name">
                      {def.name}
                      <em>Lv.{weapon.level}</em>
                    </span>
                    <span className="shop-slot__meta">
                      购入 <b>◉ {weapon.paid}</b>
                      <span aria-hidden="true">/</span>
                      返还 <b>◉ {refund}</b>
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      disabled={!canSellAny}
                      title={canSellAny ? undefined : '至少保留一把武器'}
                      aria-label={
                        canSellAny
                          ? `出售 ${def.name}，返还 ${refund} 金币`
                          : `${def.name} 是最后一把武器，无法出售`
                      }
                      onClick={() => setSellIndex(index)}
                    >
                      {canSellAny ? `出售 ◉ ${refund}` : '禁止出售'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="shop-screen__modules" aria-labelledby="shop-modules-title">
            <div className="shop-screen__section-head shop-screen__section-head--compact">
              <h2 id="shop-modules-title" className="shop-screen__section-title">
                <span aria-hidden="true">◈</span>
                模块载荷
              </h2>
              <p className="shop-screen__section-note">已持有模块</p>
            </div>

            <div className="shop-screen__module-list">
              {shop.moduleSummary.length > 0 ? (
                shop.moduleSummary.map((module) => (
                  <span key={module.id} className="shop-screen__module">
                    <span className="shop-screen__module-name">{module.name}</span>
                    <span className="shop-screen__module-count">×{module.count}</span>
                  </span>
                ))
              ) : (
                <span className="shop-screen__empty-copy">尚未装配任何模块</span>
              )}
            </div>
          </aside>
        </div>

        <footer className="shop-screen__footer">
          <div className="shop-screen__footer-left">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              刷新 <span aria-hidden="true">◉</span> {shop.refreshCost}
            </Button>
            <p className="shop-screen__footer-note">
              离开商店后本波货架关闭 · 刷新费用逐次增加
            </p>
          </div>
          <p className="shop-screen__footer-right">
            <kbd className="ui-key">TAB</kbd>
            <span>浏览商品 · ENTER 确认</span>
          </p>
        </footer>
      </div>

      <div
        className={cn('shop-screen__toast', toast && 'is-visible')}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast ? (
          <>
            <Icon name="warning" size={15} />
            <span>{toast.message}</span>
          </>
        ) : null}
      </div>

      <Modal
        open={sellWeapon !== null}
        title={sellDef ? `出售 ${sellDef.name}？` : '出售武器？'}
        eyebrow="EQUIPMENT // SELL CONFIRM"
        onClose={() => setSellIndex(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSellIndex(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleSellConfirm}>
              确认出售
            </Button>
          </>
        }
      >
        <p className="shop-screen__modal-copy">
          出售后武器将从装备栏移除，并立即返还购入价的 50%。此操作无法撤销。
        </p>

        {sellWeapon && sellDef ? (
          <div className="shop-screen__confirm-card">
            <span className="shop-screen__confirm-name">
              {sellDef.name}
              <em>Lv.{sellWeapon.level}</em>
            </span>
            <span className="shop-screen__confirm-row">
              <span>购入价</span>
              <b>◉ {sellWeapon.paid}</b>
            </span>
            <span className="shop-screen__confirm-row">
              <span>返还</span>
              <b className="text-amber">◉ {sellRefund(sellWeapon.paid)}</b>
            </span>
            <span className="shop-screen__confirm-row">
              <span>剩余武器</span>
              <b>{run.weapons.length - 1} 把</b>
            </span>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={replaceOpen}
        title={pendingOffer ? `替换装备 · ${pendingOffer.name}` : '替换装备'}
        eyebrow="EQUIPMENT // SLOT REQUIRED"
        onClose={onCancelPending}
        footer={
          <Button variant="ghost" onClick={onCancelPending}>
            取消购买
          </Button>
        }
      >
        <p className="shop-screen__modal-copy">
          4 个装备槽已满。选择要替换的武器，被替换的武器将立即返还购入价的 50%。
        </p>

        {pendingOffer ? (
          <div className="shop-screen__incoming">
            <span className="shop-screen__incoming-kind">
              {pendingOffer.kind === 'weapon' ? '新武器' : '新模块'}
            </span>
            <span className="shop-screen__incoming-name">
              {pendingOffer.name}
              {pendingOffer.level ? <em>Lv.{pendingOffer.level}</em> : null}
            </span>
            <span className="shop-screen__incoming-price">◉ {pendingOffer.price}</span>
          </div>
        ) : null}

        <div className="shop-screen__replace-list">
          {Array.from({ length: 4 }, (_, index) => {
            const weapon = run.weapons[index];
            if (!weapon) {
              return (
                <button
                  key={`replace-${index}`}
                  type="button"
                  className="shop-screen__replace-slot"
                  disabled
                >
                  <span className="shop-screen__replace-index">SLOT 0{index + 1}</span>
                  <span className="shop-screen__replace-name">空槽</span>
                  <span className="shop-screen__replace-refund">无需替换</span>
                </button>
              );
            }

            const def = WEAPONS_BY_ID[weapon.id];
            const refund = sellRefund(weapon.paid);

            return (
              <button
                key={`${weapon.id}-${index}`}
                type="button"
                className="shop-screen__replace-slot"
                aria-label={`用新装备替换 ${def.name}，返还 ${refund} 金币`}
                onClick={() => onReplace(index)}
              >
                <span className="shop-screen__replace-index">SLOT 0{index + 1}</span>
                <span className="shop-screen__replace-name">
                  {def.name}
                  <em>Lv.{weapon.level}</em>
                </span>
                <span className="shop-screen__replace-refund">
                  返还 <b>◉ {refund}</b>
                </span>
                <span className="shop-screen__replace-action">
                  替换
                  <Icon name="chevron-right" size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </main>
  );
}
