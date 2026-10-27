import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import type { UpgradeChoice } from '../../game/types';
import { cn } from '../lib/cn';
import '../../styles/upgrade.css';

export interface UpgradeScreenProps {
  choices: UpgradeChoice[];
  coins: number;
  wave: number;
  onChoose: (id: UpgradeChoice['id']) => void;
  onSkip: () => void;
}

const SKIP_REWARD = 8;

export function UpgradeScreen({
  choices,
  coins,
  wave,
  onChoose,
  onSkip,
}: UpgradeScreenProps): JSX.Element {
  const firstCardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstCardRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!/^[1-9]$/.test(event.key)) return;

      const index = Number(event.key) - 1;
      const choice = choices[index];
      if (!choice) return;

      event.preventDefault();
      onChoose(choice.id);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [choices, onChoose]);

  return (
    <main className="upgrade-screen" aria-labelledby="upgrade-title">
      <div className="upgrade-screen__grid" aria-hidden="true" />
      <div className="upgrade-screen__scanlines" aria-hidden="true" />

      <div className="upgrade-screen__frame">
        <header className="upgrade-screen__header">
          <div className="upgrade-screen__heading">
            <p className="eyebrow">CIRCUIT CALIBRATION // WAVE {String(wave).padStart(2, '0')}</p>
            <h1 id="upgrade-title" className="upgrade-screen__title">
              回路升级 · 选择 1 项
            </h1>
            <p className="upgrade-screen__subtitle">
              选择后立即写入当前构筑；也可放弃强化，换取下一波启动资金。
            </p>
          </div>

          <div className="upgrade-screen__meta" aria-label={`当前金币 ${coins}，波次 ${wave}`}>
            <span className="upgrade-screen__meta-item upgrade-screen__meta-item--coins">
              <Icon name="coin" size={16} />
              <strong>{coins}</strong>
              <span>金币</span>
            </span>
            <span className="upgrade-screen__meta-item">
              <span className="upgrade-screen__meta-label">WAVE</span>
              <strong>{String(wave).padStart(2, '0')}</strong>
            </span>
          </div>
        </header>

        <section className="upgrade-screen__choices" aria-label="可选择的回路升级">
          {choices.map((choice, index) => {
            const label = choice.type === 'repair' ? '应急维修' : choice.name;
            const isRepair = choice.type === 'repair';

            return (
              <button
                key={`${choice.id}-${index}`}
                ref={index === 0 ? firstCardRef : undefined}
                type="button"
                className={cn('upgrade-card', isRepair && 'upgrade-card--repair')}
                aria-label={`${label}，${choice.description}，已叠加 ${choice.stacks}/${choice.maxStacks}`}
                onClick={() => onChoose(choice.id)}
              >
                <span className="upgrade-card__beam" aria-hidden="true" />
                <span className="upgrade-card__corner upgrade-card__corner--tl" aria-hidden="true" />
                <span className="upgrade-card__corner upgrade-card__corner--br" aria-hidden="true" />

                <span className="upgrade-card__top">
                  <span className="upgrade-card__icon" aria-hidden="true">
                    {choice.icon}
                  </span>
                  <span className="upgrade-card__key" aria-hidden="true">
                    <kbd className="ui-key">{index + 1}</kbd>
                  </span>
                </span>

                <span className="upgrade-card__kind">
                  {isRepair ? 'EMERGENCY REPAIR' : 'STAT MODULE'}
                </span>
                <span className="upgrade-card__name">{label}</span>
                <span className="upgrade-card__description">{choice.description}</span>

                <span className="upgrade-card__footer">
                  <span className="upgrade-card__stacks">
                    已叠加 <strong>{choice.stacks}</strong>/{choice.maxStacks}
                  </span>
                  <span className="upgrade-card__action">
                    选择
                    <Icon name="chevron-right" size={14} />
                  </span>
                </span>

                <span className="upgrade-card__meter" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(100, (choice.stacks / Math.max(1, choice.maxStacks)) * 100)}%`,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </section>

        <footer className="upgrade-screen__footer">
          <p className="upgrade-screen__hint">
            <kbd className="ui-key">1</kbd>
            <kbd className="ui-key">2</kbd>
            <kbd className="ui-key">3</kbd>
            <span>快速选择 · Tab 切换 · Enter 确认</span>
          </p>

          <Button variant="secondary" onClick={onSkip}>
            跳过并获得 {SKIP_REWARD} 金币
          </Button>
        </footer>
      </div>
    </main>
  );
}
