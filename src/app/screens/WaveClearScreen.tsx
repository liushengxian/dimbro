/// <reference types="vite/client" />
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import type { WaveSummary } from '../../game/types';
import '../../styles/wave-clear.css';

export interface WaveClearScreenProps {
  summary: WaveSummary;
  characterName: string;
  onContinue: () => void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('zh-CN');

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatCount(value: number): string {
  return NUMBER_FORMAT.format(Math.max(0, Math.round(value)));
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function WaveClearScreen({
  summary,
  characterName,
  onContinue,
}: WaveClearScreenProps): JSX.Element {
  const wave = clamp(Math.round(summary.wave), 1, 99);
  const picked = Math.max(0, Math.round(summary.pickedCoins));
  const reward = Math.max(0, Math.round(summary.reward));
  const repaired = Math.max(0, Math.round(summary.simonRepairCoins));
  const lost = Math.max(0, Math.round(summary.lostCoins));
  const shields = Math.max(0, Math.round(summary.shieldsGained));
  const income = picked + reward + repaired;

  return (
    <section
      className="wave-clear"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wave-clear-title"
    >
      <div className="wave-clear__frame">
        <header className="wave-clear__header">
          <div className="wave-clear__header-main">
            <p className="eyebrow">
              WAVE {String(wave).padStart(2, '0')} CLEAR // BUILD STABLE
            </p>
            <h1 id="wave-clear-title" className="wave-clear__title">
              第 {wave} 波 <span aria-hidden="true">·</span> 构建稳定
            </h1>
            <p className="wave-clear__subtitle">
              构建通过校验，下一层回路已解锁。{characterName} 正在回收战场残料。
            </p>
          </div>
          <div className="wave-clear__stamp" aria-hidden="true">
            <span>BUILD</span>
            <strong>PASS</strong>
          </div>
        </header>

        <div className="wave-clear__body">
          <section className="wave-clear__coins" aria-labelledby="wave-clear-coins-title">
            <div className="wave-clear__section-head">
              <h2 id="wave-clear-coins-title">金币结算</h2>
              <span className="wave-clear__operator">OPERATOR {characterName}</span>
            </div>

            <div className="wave-clear__coin-row">
              <span>已拾取</span>
              <strong className="is-positive">+{formatCount(picked)}</strong>
            </div>
            <div className="wave-clear__coin-row">
              <span>完成奖励</span>
              <strong className="is-positive">+{formatCount(reward)}</strong>
            </div>
            <div className="wave-clear__coin-row">
              <span>Simon 自动修复</span>
              {repaired > 0 ? (
                <strong className="is-positive">+{formatCount(repaired)}</strong>
              ) : (
                <em className="wave-clear__coin-none">
                  {characterName === 'Simon' ? 'Simon 无需修复' : '无自动修复'}
                </em>
              )}
            </div>
            <div className="wave-clear__coin-row">
              <span>未拾取损失</span>
              <strong className={lost > 0 ? 'is-negative' : 'is-muted'}>
                {lost > 0 ? `-${formatCount(lost)}` : '0'}
              </strong>
            </div>
            <div className="wave-clear__coin-row">
              <span>维修护盾获得</span>
              <strong className={shields > 0 ? 'is-mint' : 'is-muted'}>
                {shields > 0 ? `+${shields} 层` : '无'}
              </strong>
            </div>
            <div className="wave-clear__coin-row wave-clear__coin-row--total">
              <span>本波入账</span>
              <strong className="is-amber">+{formatCount(income)}</strong>
            </div>
          </section>

          <section className="wave-clear__summary" aria-labelledby="wave-clear-summary-title">
            <div className="wave-clear__section-head">
              <h2 id="wave-clear-summary-title">作战摘要</h2>
              <span className="wave-clear__badge">
                <Icon name="check" size={12} />
                清场
              </span>
            </div>

            <div className="wave-clear__stats">
              <div className="wave-clear__stat">
                <span>击杀</span>
                <strong>{formatCount(summary.kills)}</strong>
              </div>
              <div className="wave-clear__stat">
                <span>造成伤害</span>
                <strong>{formatCount(summary.damage)}</strong>
              </div>
              <div className="wave-clear__stat">
                <span>用时</span>
                <strong>{formatDuration(summary.duration)}</strong>
              </div>
            </div>

            <p className="wave-clear__note">
              <Icon name="info" size={13} />
              金币结算先于完成奖励发放；维修护盾最多持有 2 层并跨波保留。
            </p>
          </section>
        </div>

        <footer className="wave-clear__footer">
          <p className="wave-clear__next">
            <span className="eyebrow">NEXT</span>
            回路升级 · 选择 1 项强化
          </p>
          <Button
            variant="primary"
            size="lg"
            autoFocus
            onClick={onContinue}
            trailingIcon={<Icon name="arrow-right" size={18} />}
          >
            进入回路升级
          </Button>
        </footer>
      </div>
    </section>
  );
}
