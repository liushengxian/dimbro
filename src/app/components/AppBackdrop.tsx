/// <reference types="vite/client" />
import type { CSSProperties, JSX } from 'react';
import { cn } from '../lib/cn';
import '../../styles/backdrop.css';

export interface AppBackdropProps {
  variant?: 'home' | 'select' | 'result';
  className?: string;
}

const GLYPHS = ['0', '1', '░', '▒', '▓', '█', '<', '>', '/', '\\', '|', '#', '*', '+', '=', '%', ':', ';'];

const SNOW = Array.from({ length: 46 }, (_, index) => {
  const glyph = GLYPHS[(index * 7 + 3) % GLYPHS.length] ?? '0';
  const left = (index * 37 + 11) % 100;
  const top = (index * 53 + 5) % 100;
  const style: CSSProperties = {
    left: `${left}%`,
    top: `${top}%`,
    opacity: 0.14 + ((index * 13) % 30) / 100,
    fontSize: `${9 + ((index * 5) % 9)}px`,
    animationDelay: `${-((index * 0.41) % 7).toFixed(2)}s`,
    animationDuration: `${4.6 + (index % 6) * 0.9}s`,
  };
  return { glyph, style };
});

const CODE_LINES = [
  '> boot ./dimbro.sys --safe-mode',
  'ERR_STACK_OVERFLOW 0x04f2',
  'trace /build/forge_core:line 88',
  '> reroute power ............ 61%',
  'WARN gear_07 offline',
  '> patch accepted // commit 4f2a',
  '> awaiting operator input_',
];

function gearPath(cx: number, cy: number, radius: number, depth: number, teeth: number): string {
  const points: string[] = [];
  const steps = teeth * 2;
  for (let index = 0; index < steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps - Math.PI / 2;
    const r = index % 2 === 0 ? radius : radius - depth;
    points.push(`${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return `M${points.join(' L')} Z`;
}

function Gear({ className, teeth }: { className: string; teeth: number }) {
  const spokes = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 6;
    return {
      x: (200 + Math.cos(angle) * 76).toFixed(1),
      y: (200 + Math.sin(angle) * 76).toFixed(1),
    };
  });

  return (
    <div className={cn('app-backdrop__gear', className)} aria-hidden="true">
      <svg viewBox="0 0 400 400" focusable="false" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d={gearPath(200, 200, 152, 24, teeth)} strokeWidth="13" />
          <circle cx="200" cy="200" r="86" strokeWidth="8" opacity="0.55" />
          <circle cx="200" cy="200" r="25" strokeWidth="7" />
          {spokes.map((spoke, index) => (
            <line
              key={index}
              x1="200"
              y1="200"
              x2={spoke.x}
              y2={spoke.y}
              strokeWidth="7"
              opacity="0.65"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * 全场通用的程序化工厂背景：低亮度地面、故障终端雪花、齿轮剪影、
 * 扫描线与胶片噪点。纯 CSS / SVG 生成，不加载外部素材。
 */
export function AppBackdrop({ variant = 'home', className }: AppBackdropProps): JSX.Element {
  return (
    <div
      className={cn('app-backdrop', `app-backdrop--${variant}`, className)}
      aria-hidden="true"
    >
      <div className="app-backdrop__sky" />
      <div className="app-backdrop__floor" />
      <div className="app-backdrop__glow" />

      <Gear className="app-backdrop__gear--a" teeth={18} />
      <Gear className="app-backdrop__gear--b" teeth={12} />
      <Gear className="app-backdrop__gear--c" teeth={9} />

      <div className="app-backdrop__pipes">
        <span />
        <span />
        <span />
      </div>

      <div className="app-backdrop__terminal">
        <div className="app-backdrop__terminal-bar">
          <i />
          <i />
          <i />
          <span>build-monitor — 03</span>
        </div>
        <div className="app-backdrop__terminal-screen">
          <div className="app-backdrop__snow">
            {SNOW.map((flake, index) => (
              <span key={index} style={flake.style}>
                {flake.glyph}
              </span>
            ))}
          </div>
          <div className="app-backdrop__code">
            {CODE_LINES.map((line, index) => (
              <span key={line} data-warn={index === 1 || index === 4 || undefined}>
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="app-backdrop__alert">
        <span className="app-backdrop__alert-dot" />
        <span>BUILD UNSTABLE</span>
        <span className="app-backdrop__alert-code">0x04F2</span>
      </div>

      <div className="app-backdrop__scanlines" />
      <div className="app-backdrop__grain" />
      <div className="app-backdrop__vignette" />
    </div>
  );
}
