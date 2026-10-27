/// <reference types="vite/client" />
import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { AppBackdrop } from '../components/AppBackdrop';
import { ProgrammerAvatar } from '../components/ProgrammerAvatar';
import { CHARACTER_LIST, CHARACTERS_BY_ID } from '../../game/data/characters';
import { WEAPONS_BY_ID } from '../../game/data/weapons';
import type { CharacterDef, PlayableCharacterId } from '../../game/types';
import { cn } from '../lib/cn';
import '../../styles/character-select.css';

export interface CharacterSelectScreenProps {
  initialCharacterId: PlayableCharacterId;
  hasSave: boolean;
  saveSummary: { characterName: string; wave: number } | null;
  onBack: () => void;
  onStart: (characterId: PlayableCharacterId) => void;
}

const DIFFICULTY_LABELS: Record<CharacterDef['difficulty'], string> = {
  1: '★☆☆',
  2: '★★☆',
  3: '★★★',
};

export function CharacterSelectScreen({
  initialCharacterId,
  hasSave,
  saveSummary,
  onBack,
  onStart,
}: CharacterSelectScreenProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<PlayableCharacterId>(initialCharacterId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeTick, setNoticeTick] = useState(0);

  const selected = CHARACTERS_BY_ID[selectedId];

  useEffect(() => {
    if (!noticeVisible) return;
    const timer = window.setTimeout(() => setNoticeVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [noticeVisible, noticeTick]);

  const showDisabledNotice = useCallback(() => {
    setNoticeTick((tick) => tick + 1);
    setNoticeVisible(true);
  }, []);

  const requestStart = useCallback(() => {
    setNoticeVisible(false);
    if (hasSave) {
      setConfirmOpen(true);
      return;
    }
    onStart(selectedId);
  }, [hasSave, onStart, selectedId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.defaultPrevented || confirmOpen) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'button, a, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]',
        )
      ) {
        return;
      }
      event.preventDefault();
      requestStart();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmOpen, requestStart]);

  function confirmOverwrite() {
    setConfirmOpen(false);
    onStart(selectedId);
  }

  return (
    <main className="character-select">
      <AppBackdrop variant="select" />

      <div className="character-select__frame">
        <header className="character-select__topbar">
          <Button
            variant="ghost"
            size="sm"
            className="character-select__back"
            leadingIcon={<Icon name="arrow-left" size={16} />}
            onClick={onBack}
          >
            返回
          </Button>

          <div className="character-select__heading">
            <p className="eyebrow">ROSTER // NIGHT SHIFT 04</p>
            <h1 className="character-select__title">选择程序员</h1>
          </div>

          <div className="character-select__meta">
            <span className="character-select__signal">
              <i aria-hidden="true" />
              BUILD LINK STABLE
            </span>
            <span className="character-select__count">02 ONLINE / 01 LOCKED</span>
          </div>
        </header>

        <section className="character-select__roster" aria-label="可选择的程序员">
          {CHARACTER_LIST.map((character, index) => {
            const isSelected = character.id === selectedId;
            const disabled = !character.enabled || character.id === 'junyi';
            const weapon = WEAPONS_BY_ID[character.startingWeaponId];
            const passives = character.passives.slice(0, 2);
            const difficulty = DIFFICULTY_LABELS[character.difficulty];

            return (
              <button
                key={character.id}
                type="button"
                className={cn(
                  'character-select__card',
                  isSelected && 'is-selected',
                  disabled && 'is-disabled',
                )}
                aria-label={`${character.name}，${character.role}${disabled ? '，暂时禁用' : ''}`}
                aria-pressed={disabled ? undefined : isSelected}
                aria-disabled={disabled ? 'true' : undefined}
                onClick={() => {
                  if (!character.enabled || character.id === 'junyi') {
                    showDisabledNotice();
                    return;
                  }
                  setNoticeVisible(false);
                  setSelectedId(character.id);
                }}
                onFocus={() => {
                  if (disabled) showDisabledNotice();
                }}
              >
                <span className="character-select__card-top">
                  <span className="character-select__card-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="character-select__card-state">
                    {disabled ? 'LOCKED' : isSelected ? 'SELECTED' : 'READY'}
                  </span>
                </span>

                <span className="character-select__card-avatar">
                  <ProgrammerAvatar character={character} variant="card" />
                </span>

                <span className="character-select__card-identity">
                  <span className="character-select__card-name">{character.name}</span>
                  <span className="character-select__card-callsign">{character.callsign}</span>
                  <span className="character-select__card-role">{character.role}</span>
                </span>

                {disabled ? (
                  <span className="character-select__card-lock">
                    <Icon name="lock" size={13} />
                    能力设计中
                  </span>
                ) : (
                  <span className="character-select__card-passives">
                    {passives.map((passive, passiveIndex) => (
                      <span key={passive.id} className="character-select__card-passive">
                        <b>P{passiveIndex + 1}</b>
                        {passive.name}
                      </span>
                    ))}
                  </span>
                )}

                <span className="character-select__card-stats">
                  <span>
                    <b>HP</b> {disabled ? '—' : character.base.maxHp}
                  </span>
                  <span>
                    <b>护甲</b> {disabled ? '—' : character.base.armor}
                  </span>
                  <span>
                    <b>移速</b> {disabled ? '—' : character.base.moveSpeed}
                  </span>
                </span>

                <span className="character-select__card-bottom">
                  <span className="character-select__card-weapon">
                    <span>初始武器</span>
                    <strong>{disabled ? '???' : weapon.name}</strong>
                  </span>
                  <span
                    className="character-select__card-difficulty"
                    aria-label={disabled ? '难度未定' : `推荐难度 ${character.difficulty} / 3`}
                  >
                    <span aria-hidden="true">{disabled ? '—' : difficulty}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        <section
          key={selected.id}
          className="character-select__detail"
          aria-label={`${selected.name} 的能力详情`}
        >
          <div className="character-select__detail-head">
            <p className="eyebrow">OPERATOR DOSSIER // {selected.callsign}</p>
            <h2 className="character-select__detail-name">
              {selected.name}
              <span>{selected.role}</span>
            </h2>
            <p className="character-select__detail-description">{selected.description}</p>
          </div>

          <div className="character-select__passives">
            {selected.passives.map((passive, index) => (
              <article key={passive.id} className="character-select__passive">
                <p className="character-select__passive-index">PASSIVE 0{index + 1}</p>
                <h3 className="character-select__passive-name">{passive.name}</h3>
                <p className="character-select__passive-copy">{passive.description}</p>
              </article>
            ))}
          </div>

          <div className="character-select__hint">
            <p className="eyebrow">PLAYSTYLE</p>
            <p className="character-select__hint-copy">{selected.hint}</p>
            <p className="character-select__appearance">{selected.appearanceNotes.join(' · ')}</p>
          </div>
        </section>

        <footer className="character-select__footer">
          <p className="character-select__footer-hint">
            <kbd className="ui-key">ENTER</kbd>
            <span>确认出动</span>
            <span className="character-select__footer-divider" aria-hidden="true">
              /
            </span>
            <span>Tab 切换 · 点击卡片查看被动</span>
            {hasSave ? (
              <>
                <span className="character-select__footer-divider" aria-hidden="true">
                  /
                </span>
                <span className="character-select__footer-warn">已有存档，开始新任务前需确认覆盖</span>
              </>
            ) : null}
          </p>

          <Button
            variant="primary"
            size="lg"
            onClick={requestStart}
            trailingIcon={<Icon name="arrow-right" size={17} />}
          >
            开始第 1 波
          </Button>
        </footer>
      </div>

      <div
        className={cn('character-select__notice', noticeVisible && 'is-visible')}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {noticeVisible ? (
          <>
            <Icon name="warning" size={15} />
            <span>该角色尚未完成，暂时禁用</span>
          </>
        ) : null}
      </div>

      <Modal
        open={confirmOpen}
        title="覆盖现有存档？"
        eyebrow="SAVE SLOT // OVERWRITE CHECK"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={confirmOverwrite}>
              覆盖并开始
            </Button>
          </>
        }
      >
        <p className="character-select__confirm-copy">
          覆盖现有存档并开始新任务？当前进度会被清除，此操作无法撤销。
        </p>

        <div className="character-select__save-card">
          <span className="eyebrow">EXISTING SAVE</span>
          <strong>{saveSummary ? saveSummary.characterName : '未知角色'}</strong>
          <span>{saveSummary ? `第 ${saveSummary.wave} 波待命` : '波次信息不可用'}</span>
          <span className="character-select__save-target">
            → 新任务：{selected.name} · 第 1 波
          </span>
        </div>
      </Modal>
    </main>
  );
}
