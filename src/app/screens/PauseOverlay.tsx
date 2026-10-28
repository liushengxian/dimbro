/// <reference types="vite/client" />
import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Toggle } from '../components/Toggle';
import '../../styles/battle.css';

export interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  musicEnabled: boolean;
  soundEnabled: boolean;
  shakeEnabled: boolean;
  onMusicChange: (v: boolean) => void;
  onSoundChange: (v: boolean) => void;
  onShakeChange: (v: boolean) => void;
}

export function PauseOverlay({
  onResume,
  onRestart,
  onHome,
  musicEnabled,
  soundEnabled,
  shakeEnabled,
  onMusicChange,
  onSoundChange,
  onShakeChange,
}: PauseOverlayProps): JSX.Element {
  return (
    <Modal
      open
      dismissible
      onClose={onResume}
      className="pause-overlay"
      eyebrow="MISSION PAUSED // BUILD STILL RUNNING"
      title="任务暂停"
      closeLabel="继续战斗"
      footer={
        <>
          <Button
            variant="ghost"
            leadingIcon={<Icon name="arrow-left" size={16} />}
            onClick={onHome}
          >
            返回首页
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<Icon name="refresh" size={15} />}
            onClick={onRestart}
          >
            重新开始
          </Button>
          <Button
            variant="primary"
            leadingIcon={<Icon name="play" size={15} />}
            onClick={onResume}
          >
            继续
          </Button>
        </>
      }
    >
      <div className="pause-overlay__body">
        <p className="pause-overlay__lead">
          <strong>构建仍在运行。</strong>
          战斗循环与波次计时已冻结，战场保留最后一帧；继续后从暂停点恢复。
        </p>

        <div className="pause-overlay__status">
          <span className="pause-overlay__status-item">
            <i aria-hidden="true" />
            循环冻结
          </span>
          <span className="pause-overlay__status-item">
            <i aria-hidden="true" />
            设置即时生效
          </span>
          <span className="pause-overlay__hint">
            <kbd className="ui-key">ESC</kbd>
            继续
          </span>
        </div>

        <div className="pause-overlay__settings">
          <p className="eyebrow pause-overlay__section-title">LOCAL SETTINGS</p>
          <Toggle
            label="背景音乐"
            description="程序化工业氛围循环；暂停时自动降低音量。"
            checked={musicEnabled}
            onChange={onMusicChange}
          />
          <Toggle
            label="音效"
            description="程序化合成音效；关闭后不影响战斗判定。"
            checked={soundEnabled}
            onChange={onSoundChange}
          />
          <Toggle
            label="震屏"
            description="受击、爆发与 Boss 登场时的轻量屏幕抖动。"
            checked={shakeEnabled}
            onChange={onShakeChange}
          />
        </div>
      </div>
    </Modal>
  );
}
