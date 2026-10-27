import type { JSX } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { CHARACTERS_BY_ID } from '../../game/data/characters';
import type { ResultView } from '../../game/types';
import { cn } from '../lib/cn';
import '../../styles/result.css';

export interface ResultScreenProps {
  result: ResultView;
  onRestart: () => void;
  onHome: () => void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('zh-CN');

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(Math.round(value));
}

export function ResultScreen({ result, onRestart, onHome }: ResultScreenProps): JSX.Element {
  const character = CHARACTERS_BY_ID[result.characterId];
  const victory = result.victory;
  const hp = `${Math.max(0, Math.ceil(result.remainingHp))} / ${Math.round(result.maxHp)}`;
  const time = formatTime(result.elapsedSeconds);

  const stats = victory
    ? [
        { label: '用时', value: time, tone: 'amber' },
        { label: '击杀', value: formatNumber(result.kills), tone: 'mint' },
        { label: '造成伤害', value: formatNumber(result.damage), tone: 'amber' },
        { label: '最高单次伤害', value: formatNumber(result.bestHit), tone: 'mint' },
        { label: '剩余生命', value: hp, tone: 'mint' },
      ]
    : [
        { label: '坚持波次', value: `第 ${result.wave} 波`, tone: 'danger' },
        { label: '击杀', value: formatNumber(result.kills), tone: 'danger' },
        { label: '造成伤害', value: formatNumber(result.damage), tone: 'danger' },
        { label: '最高单次伤害', value: formatNumber(result.bestHit), tone: 'danger' },
        { label: '用时', value: time, tone: 'danger' },
      ];

  return (
    <main
      className={cn('result-screen', victory ? 'is-victory' : 'is-defeat')}
      aria-labelledby="result-title"
    >
      <div className="result-screen__beams" aria-hidden="true">
        <span className="result-screen__beam result-screen__beam--1" />
        <span className="result-screen__beam result-screen__beam--2" />
        <span className="result-screen__beam result-screen__beam--3" />
      </div>
      <div className="result-screen__scanlines" aria-hidden="true" />
      <div className="result-screen__vignette" aria-hidden="true" />

      <div className="result-screen__frame">
        <header className="result-screen__topbar">
          <p className="eyebrow">
            {victory ? 'BUILD STATUS // STABLE' : 'BUILD STATUS // CRITICAL FAILURE'}
          </p>
          <span className="result-screen__signal">
            <i aria-hidden="true" />
            {victory ? 'ALL SYSTEMS NOMINAL' : 'CORE UNRESPONSIVE'}
          </span>
        </header>

        <section className="result-screen__hero">
          <div className="result-screen__copy">
            <p className="result-screen__code">
              {victory ? '> forge-core --shutdown: OK' : '> runtime --trace: FATAL'}
            </p>
            <h1 id="result-title" className="result-screen__title">
              {victory ? '构建已稳定' : '构建崩溃'}
            </h1>
            <p className="result-screen__headline">
              {victory ? 'BOSS 已关停' : `坚持到第 ${result.wave} 波`}
            </p>
            <p className="result-screen__operator">
              <span>{character.callsign}</span>
              {character.name} · {character.role}
            </p>
          </div>

          <div className="result-screen__visual" aria-hidden="true">
            <div className="result-screen__terminal">
              <div className="result-screen__terminal-bar">
                <span />
                <span />
                <span />
                <em>{victory ? 'BUILD.LOG' : 'PANIC.LOG'}</em>
              </div>
              <div className="result-screen__terminal-screen">
                <span>{victory ? '> build.lock --release' : '> kernel.panic --fatal'}</span>
                <span>{victory ? '> integrity ........ 100%' : '> integrity ........ 000%'}</span>
                <span>{victory ? '> status ........ STABLE' : '> status ......... LOST'}</span>
                <span className="result-screen__cursor">█</span>
              </div>
              <span className="result-screen__crack" />
            </div>

            <div className="result-screen__wreck">
              <span className="result-screen__wreck-ring" />
              <span className="result-screen__wreck-plate result-screen__wreck-plate--a" />
              <span className="result-screen__wreck-plate result-screen__wreck-plate--b" />
              <span className="result-screen__wreck-core" />
              <span className="result-screen__wreck-spark" />
              <em>{victory ? 'FORGE CORE // OFFLINE' : 'CORE // LOST'}</em>
            </div>
          </div>
        </section>

        <section className="result-screen__stats" aria-label="本局数据">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="result-screen__stat"
              data-tone={stat.tone}
            >
              <span className="result-screen__stat-label">{stat.label}</span>
              <strong className="result-screen__stat-value">{stat.value}</strong>
            </div>
          ))}
        </section>

        <section className="result-screen__build" aria-labelledby="result-build-title">
          <div className="result-screen__build-head">
            <h2 id="result-build-title" className="result-screen__build-title">
              构筑摘要
            </h2>
            <span>{victory ? 'FINAL BUILD // ARCHIVED' : 'BUILD DUMP // RECOVERED'}</span>
          </div>

          <div className="result-screen__build-grid">
            <div className="result-screen__build-group">
              <h3>
                武器 <b>{result.weapons.length}</b>
              </h3>
              <ul className="result-screen__build-list">
                {result.weapons.length > 0 ? (
                  result.weapons.map((weapon) => (
                    <li key={weapon.id}>
                      <span>{weapon.name}</span>
                      <b>Lv.{weapon.level}</b>
                    </li>
                  ))
                ) : (
                  <li className="is-empty">无</li>
                )}
              </ul>
            </div>

            <div className="result-screen__build-group">
              <h3>
                升级 <b>{result.upgrades.length}</b>
              </h3>
              <ul className="result-screen__build-list">
                {result.upgrades.length > 0 ? (
                  result.upgrades.map((upgrade) => (
                    <li key={upgrade.id}>
                      <span>{upgrade.name}</span>
                      <b>×{upgrade.stacks}</b>
                    </li>
                  ))
                ) : (
                  <li className="is-empty">无</li>
                )}
              </ul>
            </div>

            <div className="result-screen__build-group">
              <h3>
                模块 <b>{result.modules.length}</b>
              </h3>
              <ul className="result-screen__build-list">
                {result.modules.length > 0 ? (
                  result.modules.map((module) => (
                    <li key={module.id}>
                      <span>{module.name}</span>
                      <b>×{module.count}</b>
                    </li>
                  ))
                ) : (
                  <li className="is-empty">无</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <footer className="result-screen__actions">
          <p className="result-screen__footer-note">
            <span aria-hidden="true">◉</span>
            {victory
              ? `本局累计获得 ${formatNumber(result.coinsEarned)} 金币`
              : '本局终止 · 不提供同波重试'}
          </p>

          <div className="result-screen__buttons">
            <Button
              variant="primary"
              size="lg"
              onClick={onRestart}
              trailingIcon={<Icon name={victory ? 'refresh' : 'arrow-right'} size={16} />}
            >
              {victory ? '再来一局' : '重新开始'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onHome}
              leadingIcon={<Icon name="arrow-left" size={16} />}
            >
              返回首页
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
