/// <reference types="vite/client" />
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { LeaderboardDialog } from '../components/LeaderboardDialog';
import { Modal } from '../components/Modal';
import { Toggle } from '../components/Toggle';
import { AppBackdrop } from '../components/AppBackdrop';
import { ProgrammerAvatar } from '../components/ProgrammerAvatar';
import { PLAYABLE_CHARACTERS } from '../../game/data/characters';
import { WEAPONS_BY_ID } from '../../game/data/weapons';
import '../../styles/home.css';

export interface HomeScreenProps {
  hasSave: boolean;
  saveSummary: { characterName: string; wave: number } | null;
  musicEnabled: boolean;
  soundEnabled: boolean;
  shakeEnabled: boolean;
  showIntroOnMount: boolean;
  onStart: () => void;
  onContinue: () => void;
  onMusicChange: (value: boolean) => void;
  onSoundChange: (value: boolean) => void;
  onShakeChange: (value: boolean) => void;
  onIntroSeen: () => void;
}

export function HomeScreen({
  hasSave,
  saveSummary,
  musicEnabled,
  soundEnabled,
  shakeEnabled,
  showIntroOnMount,
  onStart,
  onContinue,
  onMusicChange,
  onSoundChange,
  onShakeChange,
  onIntroSeen,
}: HomeScreenProps): JSX.Element {
  const [introOpen, setIntroOpen] = useState(showIntroOnMount);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const introNotified = useRef(false);
  const audioEnabled = musicEnabled || soundEnabled;

  function toggleAudio() {
    const next = !audioEnabled;
    onMusicChange(next);
    onSoundChange(next);
  }

  function closeIntro() {
    setIntroOpen(false);
    if (!introNotified.current) {
      introNotified.current = true;
      onIntroSeen();
    }
  }

  useEffect(() => {
    if (introOpen || settingsOpen || leaderboardOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
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
      if (hasSave) onContinue();
      else onStart();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSave, introOpen, leaderboardOpen, onContinue, onStart, settingsOpen]);

  return (
    <main className="home-screen">
      <AppBackdrop variant="home" />
      <div className="home-screen__hazard home-screen__hazard--top" aria-hidden="true" />
      <div className="home-screen__hazard home-screen__hazard--bottom" aria-hidden="true" />

      <div className="home-screen__frame">
        <header className="home-screen__topbar">
          <div className="home-screen__status">
            <span className="home-screen__status-chip" aria-hidden="true">
              DB<span>//</span>07
            </span>
            <span className="home-screen__status-dot" aria-hidden="true" />
            <span>LINK UNSTABLE // REROUTE 61%</span>
          </div>

          <div className="home-screen__tools">
            <button
              type="button"
              className="home-screen__tool"
              aria-label={`声音：${audioEnabled ? '开' : '关'}`}
              aria-pressed={audioEnabled}
              title={audioEnabled ? '关闭声音' : '打开声音'}
              onClick={toggleAudio}
            >
              <span className="home-screen__tool-note" aria-hidden="true">
                🎵
              </span>
              <span className="home-screen__tool-text">
                {audioEnabled ? '声音 ON' : '打开声音'}
              </span>
            </button>
            <button
              type="button"
              className="home-screen__tool home-screen__tool--icon"
              aria-label="排行榜"
              title="排行榜"
              onClick={() => setLeaderboardOpen(true)}
            >
              <Icon name="trophy" size={15} />
            </button>
            <button
              type="button"
              className="home-screen__tool home-screen__tool--icon"
              aria-label="打开设置"
              title="打开设置"
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="gear" size={16} />
            </button>
            <span className="home-screen__version">v0.4 DEMO</span>
          </div>
        </header>

        <section className="home-screen__stage" aria-labelledby="home-wordmark">
          <div className="home-screen__hero">
            <div className="home-screen__hero-copy">
              <p className="eyebrow home-screen__eyebrow">
                DIMAGENT FIELD TERMINAL <span aria-hidden="true">//</span> NIGHT SHIFT 04
              </p>
              <h1 id="home-wordmark" className="home-screen__wordmark" data-text="dimbro">
                dimbro
              </h1>
              <div className="home-screen__subtitle-row">
                <p className="home-screen__subtitle">
                  DIMAGENT PROGRAMMERS <span>vs.</span> THE BUILD
                </p>
                <span className="home-screen__stamp" aria-hidden="true">
                  8 WAVES
                </span>
              </div>
              <p className="home-screen__quote">
                <span aria-hidden="true">&gt;</span> “先别重启，让我看看日志。”
              </p>
            </div>

            <div className="home-screen__actions-panel">
              <div className="home-screen__menu" role="group" aria-label="主菜单">
              <button type="button" className="home-menu" data-primary="true" onClick={onStart}>
                <span className="home-menu__index">01</span>
                <span className="home-menu__copy">
                  <strong>开始任务</strong>
                  <small>NEW RUN // 8 WAVES</small>
                </span>
                <span className="home-menu__arrow" aria-hidden="true">
                  <Icon name="play" size={14} />
                </span>
              </button>

              {hasSave ? (
                <button type="button" className="home-menu" onClick={onContinue}>
                  <span className="home-menu__index">02</span>
                  <span className="home-menu__copy">
                    <strong>继续任务</strong>
                    <small>
                      {saveSummary
                        ? `${saveSummary.characterName} // WAVE ${String(saveSummary.wave).padStart(2, '0')}`
                        : 'RESTORE LAST RUN'}
                    </small>
                  </span>
                  <span className="home-menu__arrow" aria-hidden="true">
                    <Icon name="refresh" size={15} />
                  </span>
                </button>
              ) : null}

              <button type="button" className="home-menu" onClick={() => setIntroOpen(true)}>
                <span className="home-menu__index">{hasSave ? '03' : '02'}</span>
                <span className="home-menu__copy">
                  <strong>操作说明</strong>
                  <small>FIELD MANUAL // 10 SEC</small>
                </span>
                <span className="home-menu__arrow" aria-hidden="true">
                  <Icon name="info" size={15} />
                </span>
              </button>
            </div>

            <div className="home-screen__mission" aria-label="任务简报">
              <div className="home-screen__mission-copy">
                <span>MISSION BRIEF // SECTOR 07</span>
                <strong>撑过 8 波故障进程，关停熔炉核心。</strong>
              </div>
              <div className="home-screen__mission-stats">
                <span>
                  <b>08</b>
                  <small>WAVES</small>
                </span>
                <span>
                  <b>10–15</b>
                  <small>MIN</small>
                </span>
                <span>
                  <b>02</b>
                  <small>READY</small>
                </span>
              </div>
            </div>

            <div className="home-screen__bootlog" aria-hidden="true">
              <span>
                <i>01</i> NIGHT SHIFT 04 // ROSTER LINK ESTABLISHED
              </span>
              <span>
                <i>02</i> BUILD SECTOR 07 // POWER REROUTED 61%
              </span>
              <span>
                <i>03</i> AWAITING DEPLOY COMMAND<em>_</em>
              </span>
            </div>

            <p className="home-screen__save-line" aria-live="polite">
              {hasSave && saveSummary
                ? `检测到本地存档：${saveSummary.characterName} 正在第 ${saveSummary.wave} 波待命`
                : '未检测到存档 · 新值班从第 1 波开始'}
            </p>
            </div>

            <div className="home-screen__radar" aria-hidden="true">
              <span className="home-screen__radar-sweep" />
              <span className="home-screen__radar-blip home-screen__radar-blip--a" />
              <span className="home-screen__radar-blip home-screen__radar-blip--b" />
              <em>SECTOR 07 // CLEAR</em>
            </div>
          </div>

          <aside className="home-screen__roster" aria-label="值班程序员">
            <div className="home-screen__roster-head">
              <span>ON-CALL OPERATORS</span>
              <span className="home-screen__roster-count">
                02 <i aria-hidden="true" /> READY
              </span>
            </div>

            <div className="home-screen__operators">
              {PLAYABLE_CHARACTERS.map((character, index) => {
                const weapon = WEAPONS_BY_ID[character.startingWeaponId];
                return (
                  <article
                    className="home-operator"
                    data-operator={character.id}
                    key={character.id}
                  >
                    <div className="home-operator__top">
                      <span className="home-operator__index">0{index + 1}</span>
                      <span className="home-operator__state">
                        <i aria-hidden="true" />
                        READY
                      </span>
                    </div>

                    <div className="home-operator__visual">
                      <span className="home-operator__ring" aria-hidden="true" />
                      <span className="home-operator__beam" aria-hidden="true" />
                      <ProgrammerAvatar character={character} variant="detail" />
                    </div>

                    <div className="home-operator__body">
                      <div className="home-operator__name-row">
                        <strong className="home-operator__name">{character.name}</strong>
                        <span className="home-operator__callsign">{character.callsign}</span>
                      </div>
                      <p className="home-operator__role">{character.role}</p>
                      <div className="home-operator__meta">
                        <span>{character.difficulty === 1 ? '★☆☆' : '★★☆'}</span>
                        <span aria-hidden="true">/</span>
                        <span>{weapon?.name ?? '武器待定'}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="home-screen__roster-foot">
              <div className="home-screen__roster-stat">
                <span>MISSION</span>
                <strong>08 WAVES</strong>
              </div>
              <div className="home-screen__roster-stat">
                <span>EST. RUN</span>
                <strong>10–15 MIN</strong>
              </div>
              <div className="home-screen__roster-stat">
                <span>BUILD</span>
                <strong>0.4.0</strong>
              </div>
            </div>
          </aside>
        </section>

        <footer className="home-screen__footer">
          <div className="home-screen__footer-left">
            <span className="home-screen__footer-tag">ON-CALL</span>
            <span>DIMAGENT 值班组 · 机械废土</span>
            <span className="home-screen__footer-names">夕阳针 / SIMON / JUNYI</span>
          </div>
          <div className="home-screen__footer-right">
            <span className="home-screen__footer-key">
              <kbd className="ui-key">ENTER</kbd>
              {hasSave ? '继续任务' : '开始任务'}
            </span>
            <span aria-hidden="true">·</span>
            <span>BUILD 0.4.0</span>
          </div>
        </footer>
      </div>

      <Modal
        open={introOpen}
        title="操作说明"
        eyebrow="FIELD MANUAL // 10 秒速览"
        onClose={closeIntro}
        footer={
          <Button variant="primary" onClick={closeIntro}>
            明白，开始值班
          </Button>
        }
      >
        <div className="home-screen__manual">
          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">移动</span>
            <div>
              <p className="home-screen__manual-keys">
                <kbd className="ui-key">W</kbd>
                <kbd className="ui-key">A</kbd>
                <kbd className="ui-key">S</kbd>
                <kbd className="ui-key">D</kbd>
                <span>或</span>
                <kbd className="ui-key">↑</kbd>
                <kbd className="ui-key">←</kbd>
                <kbd className="ui-key">↓</kbd>
                <kbd className="ui-key">→</kbd>
              </p>
              <p>走位躲弹幕、吃金币。没有冲刺，护甲与移速就是生存线。</p>
            </div>
          </div>

          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">攻击</span>
            <div>
              <p className="home-screen__manual-strong">自动攻击，无需瞄准</p>
              <p>每把武器独立索敌，优先攻击范围内最近的故障进程。</p>
            </div>
          </div>

          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">暂停</span>
            <div>
              <p className="home-screen__manual-keys">
                <kbd className="ui-key">Esc</kbd>
                <span>或</span>
                <kbd className="ui-key">P</kbd>
              </p>
              <p>暂停时游戏循环冻结，可调整音乐、音效与震屏。</p>
            </div>
          </div>

          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">8 波</span>
            <div>
              <p className="home-screen__manual-strong">撑过 7 波故障进程，关停熔炉核心</p>
              <p>第 8 波是 Boss 战。生命跨波保留，不会自动回满。</p>
            </div>
          </div>

          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">升级</span>
            <div>
              <p className="home-screen__manual-strong">每波结束三选一</p>
              <p>校准枪管、加厚装甲或回收协议——按当前构筑做取舍。</p>
            </div>
          </div>

          <div className="home-screen__manual-item">
            <span className="home-screen__manual-key">商店</span>
            <div>
              <p className="home-screen__manual-strong">波间整备，改装外骨骼</p>
              <p>购买武器与模块、刷新货架；每件商品只能买一次。</p>
            </div>
          </div>

          <p className="home-screen__manual-note">
            之后可从首页的「操作说明」再次打开本页。关闭后不再自动弹出。
          </p>
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        title="值班设置"
        eyebrow="SYSTEM // AUDIO & FEEDBACK"
        onClose={() => setSettingsOpen(false)}
        footer={
          <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
            完成
          </Button>
        }
      >
        <Toggle
          label="背景音乐"
          checked={musicEnabled}
          onChange={onMusicChange}
          description="程序化工业氛围循环；首次开启后由浏览器音频上下文播放。"
        />
        <Toggle
          label="音效"
          checked={soundEnabled}
          onChange={onSoundChange}
          description="武器、命中、金币与流程提示音，全部由 WebAudio 合成。"
        />
        <Toggle
          label="震屏"
          checked={shakeEnabled}
          onChange={onShakeChange}
          description="关闭后受击、RESET 与 Boss 登场不再抖动画面。"
        />
        <p className="home-screen__settings-note">
          音频默认关闭；设置由值班终端持久化保存，不影响当前任务存档。
        </p>
      </Modal>

      <LeaderboardDialog open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </main>
  );
}
