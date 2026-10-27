/// <reference types="vite/client" />
import { useRef, useState } from 'react';
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Toggle } from '../components/Toggle';
import { AppBackdrop } from '../components/AppBackdrop';
import '../../styles/home.css';

export interface HomeScreenProps {
  hasSave: boolean;
  saveSummary: { characterName: string; wave: number } | null;
  soundEnabled: boolean;
  shakeEnabled: boolean;
  showIntroOnMount: boolean;
  onStart: () => void;
  onContinue: () => void;
  onSoundChange: (value: boolean) => void;
  onShakeChange: (value: boolean) => void;
  onIntroSeen: () => void;
}

export function HomeScreen({
  hasSave,
  saveSummary,
  soundEnabled,
  shakeEnabled,
  showIntroOnMount,
  onStart,
  onContinue,
  onSoundChange,
  onShakeChange,
  onIntroSeen,
}: HomeScreenProps): JSX.Element {
  const [introOpen, setIntroOpen] = useState(showIntroOnMount);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const introNotified = useRef(false);

  function closeIntro() {
    setIntroOpen(false);
    if (!introNotified.current) {
      introNotified.current = true;
      onIntroSeen();
    }
  }

  return (
    <main className="home-screen">
      <AppBackdrop variant="home" />

      <div className="home-screen__frame">
        <header className="home-screen__topbar">
          <div className="home-screen__status">
            <span className="home-screen__status-dot" aria-hidden="true" />
            <span>BUILD SECTOR 07 // LINK UNSTABLE</span>
          </div>

          <div className="home-screen__tools">
            <button
              type="button"
              className="home-screen__tool"
              aria-label={`音效：${soundEnabled ? '开' : '关'}`}
              aria-pressed={soundEnabled}
              onClick={() => onSoundChange(!soundEnabled)}
            >
              <Icon name={soundEnabled ? 'volume-on' : 'volume-off'} size={15} />
              <span className="home-screen__tool-text">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
            </button>
            <button
              type="button"
              className="home-screen__tool home-screen__tool--icon"
              aria-label="打开设置"
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="gear" size={16} />
            </button>
            <span className="home-screen__version">v0.4 DEMO</span>
          </div>
        </header>

        <section className="home-screen__hero" aria-labelledby="home-wordmark">
          <div className="home-screen__hero-copy">
            <p className="eyebrow home-screen__eyebrow">
              DIMAGENT FIELD TERMINAL <span aria-hidden="true">//</span> NIGHT SHIFT 04
            </p>
            <h1 id="home-wordmark" className="home-screen__wordmark" data-text="dimbro">
              dimbro
            </h1>
            <p className="home-screen__subtitle">
              DIMAGENT PROGRAMMERS <span>vs.</span> THE BUILD
            </p>
            <p className="home-screen__quote">“先别重启，让我看看日志。”</p>
          </div>

          <div className="home-screen__actions">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onStart}
              trailingIcon={<Icon name="play" size={16} />}
            >
              开始任务
            </Button>

            {hasSave ? (
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={onContinue}
                leadingIcon={<Icon name="refresh" size={16} />}
              >
                <span className="home-screen__continue">
                  继续任务
                  {saveSummary ? (
                    <span className="home-screen__continue-meta">
                      {saveSummary.characterName} · 波次 {saveSummary.wave}/8
                    </span>
                  ) : null}
                </span>
              </Button>
            ) : null}

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIntroOpen(true)}
              leadingIcon={<Icon name="info" size={15} />}
            >
              操作说明
            </Button>
          </div>

          <p className="home-screen__save-line" aria-live="polite">
            {hasSave && saveSummary
              ? `检测到本地存档：${saveSummary.characterName} 正在第 ${saveSummary.wave} 波待命`
              : '未检测到存档 · 新值班从第 1 波开始'}
          </p>
        </section>

        <footer className="home-screen__footer">
          <div className="home-screen__footer-left">
            <span className="home-screen__footer-tag">ON-CALL</span>
            <span>DIMAGENT 值班组 · 机械废土</span>
            <span className="home-screen__footer-names">夕阳针 / SIMON / JUNYI</span>
          </div>
          <div className="home-screen__footer-right">
            <span>单局 10–15 分钟</span>
            <span aria-hidden="true">·</span>
            <span>8 波</span>
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
              <p>暂停时游戏循环冻结，可调整音效与震屏。</p>
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
          label="音效"
          checked={soundEnabled}
          onChange={onSoundChange}
          description="WebAudio 程序化合成，不依赖外部音频文件。"
        />
        <Toggle
          label="震屏"
          checked={shakeEnabled}
          onChange={onShakeChange}
          description="关闭后受击、RESET 与 Boss 登场不再抖动画面。"
        />
        <p className="home-screen__settings-note">
          设置由值班终端持久化保存，不影响当前任务存档。
        </p>
      </Modal>
    </main>
  );
}
