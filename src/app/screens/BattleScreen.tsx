/// <reference types="vite/client" />
import type { CSSProperties, JSX } from 'react';
import { Button } from '../components/Button';
import { GameIcon } from '../components/GameIcon';
import { Icon } from '../components/Icon';
import { ProgrammerAvatar } from '../components/ProgrammerAvatar';
import { CHARACTERS_BY_ID } from '../../game/data/characters';
import { WEAPONS_BY_ID } from '../../game/data/weapons';
import type { PlayableCharacterId, SessionSnapshot, WeaponHudState } from '../../game/types';
import { cn } from '../lib/cn';
import { PauseOverlay } from './PauseOverlay';
import '../../styles/battle.css';

export interface BattleScreenProps {
  snapshot: SessionSnapshot;
  musicEnabled: boolean;
  soundEnabled: boolean;
  shakeEnabled: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onMusicChange: (v: boolean) => void;
  onSoundChange: (v: boolean) => void;
  onShakeChange: (v: boolean) => void;
}

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

const TOTAL_WAVES = 8;
const WEAPON_SLOTS = 4;
const MAX_SHIELDS = 2;
const NUMBER_FORMAT = new Intl.NumberFormat('zh-CN');

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(Math.max(0, Math.round(value)));
}

function readyPercent(weapon: WeaponHudState): number {
  const total = Math.max(weapon.cooldownTotal, 0.0001);
  const remaining = clamp(weapon.cooldown, 0, total);
  return Math.round((1 - remaining / total) * 100);
}

interface PassiveChipView {
  id: string;
  name: string;
  status: string;
  active: boolean;
  tone: 'mint' | 'amber';
}

function passiveChips(
  characterId: PlayableCharacterId | undefined,
  resetActive: boolean,
  lightTrailActive: boolean,
  simonShields: number,
  characterName: string,
): PassiveChipView[] {
  if (characterId === 'sunsetNeedle') {
    return [
      {
        id: 'reset',
        name: 'RESET',
        status: resetActive ? '攻速 ×5 · 伤害 +15%' : '2% 命中触发',
        active: resetActive,
        tone: 'amber',
      },
      {
        id: 'lightTrail',
        name: '光轨追焦',
        status: lightTrailActive ? '移速+10% / 暴击+8%' : '连续移动 1 秒',
        active: lightTrailActive,
        tone: 'mint',
      },
    ];
  }

  if (characterId === 'simon') {
    return [
      {
        id: 'simonTooStrong',
        name: 'Simon太强了',
        status: '伤害 +50%',
        active: true,
        tone: 'mint',
      },
      {
        id: 'simonWillFixIt',
        name: 'Simon今天会修的',
        status: simonShields > 0 ? `维修护盾 ${simonShields}/${MAX_SHIELDS}` : '波末立即回收',
        active: simonShields > 0,
        tone: 'amber',
      },
    ];
  }

  return [
    {
      id: 'character',
      name: characterName,
      status: '专属被动离线',
      active: false,
      tone: 'mint',
    },
  ];
}

export function BattleScreen({
  snapshot,
  musicEnabled,
  soundEnabled,
  shakeEnabled,
  onPause,
  onResume,
  onRestart,
  onHome,
  onMusicChange,
  onSoundChange,
  onShakeChange,
}: BattleScreenProps): JSX.Element {
  const { player, passives, boss, run } = snapshot;
  const character = run ? CHARACTERS_BY_ID[run.characterId] : null;
  const characterName = character?.name ?? '未知程序员';
  const isSimon = run?.characterId === 'simon';
  const shieldCount = passives?.simonShields ?? run?.shields ?? 0;
  const simonShields = clamp(Math.round(shieldCount), 0, MAX_SHIELDS);
  const shieldPercent = (simonShields / MAX_SHIELDS) * 100;

  const hpRatio = clamp(player.hp / Math.max(player.maxHp, 1), 0, 1);
  const waveRatio = clamp(snapshot.waveProgress, 0, 1);
  const bossRatio = boss ? clamp(boss.hp / Math.max(boss.maxHp, 1), 0, 1) : 0;
  const countdownDanger = !snapshot.bossWave && snapshot.waveTimeLeft <= 5;
  const resetActive = Boolean(passives?.resetActive);
  const resetRatio = resetActive
    ? clamp(
        (passives?.resetRemaining ?? 0) / Math.max(passives?.resetMax ?? 0.001, 0.001),
        0,
        1,
      )
    : 0;
  const resetRemaining = passives?.resetRemaining ?? 0;
  const resetMax = passives?.resetMax ?? 0;

  const chips = passiveChips(
    run?.characterId,
    resetActive,
    Boolean(passives?.lightTrailActive),
    simonShields,
    characterName,
  );

  const totals = run?.totals;

  return (
    <>
      <div
        className={cn('battle-hud', snapshot.paused && 'is-paused')}
        data-phase={snapshot.phase}
      >
        <div
          className="battle-hud__vignette"
          data-low={player.lowHp || undefined}
          aria-hidden="true"
        />
        {player.iframes > 0 ? <div className="battle-hud__hitflash" aria-hidden="true" /> : null}

        <header className="battle-hud__top">
          <div className="battle-hud__wave">
            <span className="eyebrow">WAVE CONTROL // SECTOR 07</span>
            <div className="battle-hud__wave-line">
              <strong>
                波次 {snapshot.wave}/{TOTAL_WAVES}
              </strong>
              <span className="battle-hud__wave-name">{snapshot.waveLabel}</span>
            </div>
          </div>

          <div className="battle-hud__clock">
            <div className="battle-hud__clock-line">
              <span className="battle-hud__clock-label">
                {snapshot.bossWave ? 'BOSS 压制' : '剩余时间'}
              </span>
              <strong className="battle-hud__timer" data-danger={countdownDanger || undefined}>
                {snapshot.bossWave ? '--:--' : formatClock(snapshot.waveTimeLeft)}
              </strong>
            </div>
            <div
              className="battle-hud__progress"
              role="progressbar"
              aria-label="波次进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(waveRatio * 100)}
            >
              <span style={{ width: `${waveRatio * 100}%` }} />
            </div>
            <span className="battle-hud__clock-foot">
              {snapshot.bossWave
                ? '击败核心以结束本波'
                : snapshot.waveTimeLeft <= 5
                  ? '最后的输出窗口'
                  : `进度 ${Math.round(waveRatio * 100)}%`}
            </span>
          </div>

          <div className="battle-hud__operator">
            <div className="battle-hud__operator-copy">
              <span className="eyebrow">OPERATOR</span>
              <span className="battle-hud__operator-name">{characterName}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onPause}
              aria-label="暂停游戏（Esc）"
              leadingIcon={<Icon name="pause" size={15} />}
              trailingIcon={<span className="battle-hud__key-hint">ESC</span>}
            >
              暂停
            </Button>
          </div>
        </header>

        {snapshot.bossWave ? (
          <section
            className="battle-hud__boss"
            data-phase={boss?.phase ?? 1}
            data-enraged={boss?.enraged || undefined}
            aria-label="Boss 状态"
          >
            <div className="battle-hud__boss-head">
              <span className="battle-hud__boss-tag">
                BOSS <i aria-hidden="true">//</i> PHASE {boss?.phase ?? 1}
              </span>
              <span className="battle-hud__boss-name">熔炉核心</span>
              <span className="battle-hud__boss-hp">
                {boss ? `${formatNumber(boss.hp)} / ${formatNumber(boss.maxHp)}` : '信号接入中'}
              </span>
            </div>
            <div
              className="battle-hud__boss-track"
              role="progressbar"
              aria-label="Boss 生命"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(bossRatio * 100)}
            >
              <span style={{ width: `${bossRatio * 100}%` }} />
            </div>
            {boss?.enraged ? (
              <p className="battle-hud__boss-enrage" role="alert">
                <Icon name="warning" size={13} />
                软狂暴 · 核心过载，保持移动
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="battle-hud__player" aria-label="玩家状态">
          <div className="battle-hud__player-row">
            <div className="battle-hud__avatar">
              {character ? (
                <ProgrammerAvatar character={character} variant="hud" />
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </div>

            <div className="battle-hud__player-body">
              <div className="battle-hud__ident">
                <span className="battle-hud__ident-name">{characterName}</span>
                <span className="battle-hud__ident-role">{character?.role ?? '外骨骼离线'}</span>
              </div>

              <div className="battle-hud__vitals">
                <div className="battle-hud__hp">
                  <div className="battle-hud__hp-head">
                    <span>
                      <Icon name="heart" size={12} />
                      生命
                    </span>
                    <strong>
                      {Math.ceil(player.hp)} / {Math.round(player.maxHp)}
                    </strong>
                  </div>
                  <div
                    className="battle-hud__hp-track"
                    role="progressbar"
                    aria-label="生命值"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(player.maxHp)}
                    aria-valuenow={Math.round(clamp(player.hp, 0, player.maxHp))}
                  >
                    <span
                      data-low={player.lowHp || undefined}
                      style={{ width: `${hpRatio * 100}%` }}
                    />
                  </div>
                </div>

                {isSimon ? (
                  <div
                    className="battle-hud__repair"
                    data-empty={simonShields === 0 || undefined}
                    role="img"
                    aria-label={`Simon 维修护盾 ${simonShields}/${MAX_SHIELDS} 层`}
                  >
                    <div
                      className="battle-hud__repair-ring"
                      style={{ '--shield-charge': `${shieldPercent}%` } as CssVars}
                    >
                      <span>{simonShields}</span>
                    </div>
                    <span className="battle-hud__repair-label">维修 {simonShields}/2</span>
                  </div>
                ) : null}
              </div>

              <div className="battle-hud__meta">
                <span className="battle-hud__armor">
                  <Icon name="shield" size={12} />
                  护甲 {Math.round(player.armor)}
                </span>
                <span className="battle-hud__meta-signal">
                  <i aria-hidden="true" />
                  {snapshot.bossWave ? '核心锁定' : '自动瞄准'}
                </span>
              </div>
            </div>
          </div>

          {resetActive ? (
            <div
              className="battle-hud__reset"
              role="progressbar"
              aria-label="RESET 剩余时间"
              aria-valuemin={0}
              aria-valuemax={Number(resetMax.toFixed(1))}
              aria-valuenow={Number(resetRemaining.toFixed(1))}
            >
              <div className="battle-hud__reset-head">
                <span>RESET // 故障爆发</span>
                <strong>
                  {resetRemaining.toFixed(1)}s / {resetMax.toFixed(1)}s
                </strong>
              </div>
              <div className="battle-hud__reset-track">
                <span style={{ width: `${resetRatio * 100}%` }} />
              </div>
            </div>
          ) : null}

          <div className="battle-hud__weapons" role="group" aria-label="武器槽">
            {Array.from({ length: WEAPON_SLOTS }, (_, index) => {
              const weapon = snapshot.weapons[index];
              if (!weapon) {
                return (
                  <div
                    className="battle-hud__weapon"
                    data-empty="true"
                    key={`weapon-empty-${index}`}
                    role="group"
                    aria-label={`第 ${index + 1} 个武器槽，空`}
                  >
                    <span className="battle-hud__weapon-empty" aria-hidden="true">
                      +
                    </span>
                    <span className="battle-hud__weapon-empty-label">空槽</span>
                  </div>
                );
              }

              const ready = readyPercent(weapon);
              const level = clamp(Math.round(weapon.level), 1, 3);
              const definition = WEAPONS_BY_ID[weapon.id];
              return (
                <div
                  className="battle-hud__weapon"
                  key={`weapon-${weapon.id}-${index}`}
                  title={`${weapon.name} Lv.${level} · ${definition?.description ?? weapon.name}`}
                  role="group"
                  style={{ '--ring-color': weapon.color } as CssVars}
                  aria-label={`${weapon.name} 等级 ${level}，${ready >= 100 ? '就绪' : `充能 ${ready}%`}`}
                >
                  <div
                    className="battle-hud__weapon-ring"
                    style={{ '--ring-ready': `${ready}%` } as CssVars}
                    aria-hidden="true"
                  >
                    <GameIcon
                      name={weapon.id}
                      size={18}
                      strokeWidth={2}
                      className="battle-hud__weapon-icon"
                    />
                  </div>
                  <div className="battle-hud__weapon-copy">
                    <span className="battle-hud__weapon-name">{weapon.name}</span>
                    <span className="battle-hud__weapon-level" aria-hidden="true">
                      {Array.from({ length: 3 }, (_, dot) => (
                        <i key={dot} data-on={dot < level || undefined} />
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="battle-hud__passives" role="group" aria-label="角色被动">
            {chips.map((chip) => (
              <div
                className="battle-hud__passive"
                data-active={chip.active || undefined}
                data-tone={chip.tone}
                key={chip.id}
              >
                <Icon name="spark" size={11} />
                <span className="battle-hud__passive-name">{chip.name}</span>
                <span className="battle-hud__passive-status">{chip.status}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="battle-hud__score" aria-label="战斗统计">
          <div className="battle-hud__coins">
            <Icon name="coin" size={18} />
            <strong key={snapshot.coins}>{formatNumber(snapshot.coins)}</strong>
            <span>金币</span>
          </div>
          {snapshot.baggedCoins > 0 ? (
            <div className="battle-hud__bag" aria-label={`袋中金币 ${snapshot.baggedCoins}`}>
              <span>袋中</span>
              <strong>{formatNumber(snapshot.baggedCoins)}</strong>
              <span>枚</span>
            </div>
          ) : null}
          <div className="battle-hud__score-stats">
            <div className="battle-hud__score-stat">
              <span>累计击杀</span>
              <strong>{totals ? formatNumber(totals.kills) : '—'}</strong>
            </div>
            <div className="battle-hud__score-stat">
              <span>累计伤害</span>
              <strong>{totals ? formatNumber(totals.damage) : '—'}</strong>
            </div>
          </div>
          <div className="battle-hud__score-wave">
            WAVE {String(snapshot.wave).padStart(2, '0')} / {TOTAL_WAVES}
          </div>
        </aside>
      </div>

      {snapshot.paused ? (
        <PauseOverlay
          onResume={onResume}
          onRestart={onRestart}
          onHome={onHome}
          musicEnabled={musicEnabled}
          soundEnabled={soundEnabled}
          shakeEnabled={shakeEnabled}
          onMusicChange={onMusicChange}
          onSoundChange={onSoundChange}
          onShakeChange={onShakeChange}
        />
      ) : null}
    </>
  );
}
