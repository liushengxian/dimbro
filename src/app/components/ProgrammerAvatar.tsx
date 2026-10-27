/// <reference types="vite/client" />
import type { JSX } from 'react';
import type { CharacterDef } from '../../game/types';
import { cn } from '../lib/cn';
import '../../styles/avatar.css';

export interface ProgrammerAvatarProps {
  character: CharacterDef;
  variant?: 'card' | 'detail' | 'hud';
  className?: string;
}

const OUTLINE = '#05100c';
const DEEP = '#081410';

/**
 * 程序化 Q 版外骨骼半身像。所有轮廓、护甲、线缆都以内联 SVG 绘制，
 * 不引用任何外部图片或字体资源。
 */
export function ProgrammerAvatar({
  character,
  variant = 'card',
  className,
}: ProgrammerAvatarProps): JSX.Element {
  const p = character.palette;
  const isSunset = character.id === 'sunsetNeedle';
  const isSimon = character.id === 'simon';
  const isJunyi = character.id === 'junyi';
  const hud = variant === 'hud';
  const detailed = variant === 'detail';
  const viewBox = hud ? '36 22 168 202' : '0 0 240 336';

  return (
    <svg
      className={cn(
        'programmer-avatar',
        `programmer-avatar--${variant}`,
        isJunyi && 'programmer-avatar--disabled',
        className,
      )}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        className="programmer-avatar__halo"
        cx="120"
        cy="156"
        r="108"
        fill={p.glow}
        opacity="0.08"
      />

      {!hud ? (
        <ellipse
          className="programmer-avatar__shadow"
          cx="120"
          cy="322"
          rx="62"
          ry="9"
          fill="#000000"
          opacity="0.5"
        />
      ) : null}

      <g className="programmer-avatar__rig">
        {/* 背包 ---------------------------------------------------------- */}
        {isSimon && !hud ? (
          <g className="programmer-avatar__pack">
            <rect
              x="148"
              y="148"
              width="38"
              height="66"
              rx="7"
              fill={p.metal}
              stroke={OUTLINE}
              strokeWidth="5"
            />
            <rect
              x="155"
              y="157"
              width="24"
              height="17"
              rx="3"
              fill={p.secondary}
              opacity="0.62"
            />
            <path
              d="M151 170c-15 8-14 24-1 31"
              fill="none"
              stroke={p.glow}
              strokeWidth="3.5"
            />
            <path
              d="M185 165c18 8 16 28 0 35"
              fill="none"
              stroke={p.glow}
              strokeWidth="3.5"
            />
            <path d="M160 192h16" stroke={p.visor} strokeWidth="2.5" opacity="0.65" />
          </g>
        ) : null}

        {isSunset && !hud ? (
          <g className="programmer-avatar__pack">
            <path
              d="M148 150 180 156 186 196 158 204Z"
              fill={p.secondary}
              stroke={OUTLINE}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M164 158v38" stroke={p.glow} strokeWidth="3" opacity="0.8" />
            <path d="M172 160v34" stroke={p.primary} strokeWidth="2" opacity="0.55" />
          </g>
        ) : null}

        {/* 腿与靴子 ------------------------------------------------------ */}
        {!hud ? (
          <g className="programmer-avatar__legs">
            <path
              d="M96 220 92 274 84 300h29l5-50 2-30Z"
              fill={p.suit}
              stroke={OUTLINE}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M124 220l4 30 5 50h29l-8-26-4-54Z"
              fill={p.suit}
              stroke={OUTLINE}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M80 292h38v16H82c-4 0-6-3-6-6v-4c0-3 1-6 4-6Z"
              fill={p.metal}
              stroke={OUTLINE}
              strokeWidth="4"
            />
            <path
              d="M128 292h38c3 0 4 3 4 6v4c0 3-2 6-6 6h-36Z"
              fill={p.metal}
              stroke={OUTLINE}
              strokeWidth="4"
            />
            <path d="M90 234h10M134 234h10" stroke={p.glow} strokeWidth="3" opacity="0.55" />
          </g>
        ) : null}

        {/* 躯干 ---------------------------------------------------------- */}
        <path
          d="M88 146c1-7 6-12 14-14h36c8 2 13 7 14 14l10 66c1 8-4 15-13 16H91c-9-1-14-8-13-16Z"
          fill={p.suit}
          stroke={OUTLINE}
          strokeWidth="5"
          strokeLinejoin="round"
        />

        <path
          d="M96 150h48l7 42-31 14-31-14Z"
          fill={p.primary}
          opacity={isJunyi ? 0.38 : 0.92}
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        <path
          d="M111 163h18M107 174h26"
          stroke={p.glow}
          strokeWidth="3"
          opacity={isJunyi ? 0.25 : 0.6}
          strokeLinecap="round"
        />

        {/* 腰带 ---------------------------------------------------------- */}
        {!hud ? (
          <g className="programmer-avatar__belt">
            <rect x="83" y="205" width="78" height="14" fill={p.metal} stroke={OUTLINE} strokeWidth="4" />
            <rect x="113" y="208" width="17" height="9" fill={p.primary} stroke={OUTLINE} strokeWidth="2" />
            {isSimon ? (
              <>
                <rect x="91" y="211" width="14" height="18" rx="2" fill={p.metal} stroke={OUTLINE} strokeWidth="3" />
                <rect x="137" y="209" width="12" height="19" rx="2" fill={p.metal} stroke={OUTLINE} strokeWidth="3" />
                <path
                  d="m125 219 4 17m-1-14 7 3"
                  fill="none"
                  stroke={p.glow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </>
            ) : null}
          </g>
        ) : null}

        {/* 肩甲 ---------------------------------------------------------- */}
        <path
          d="M85 143c-14 2-24 10-27 22l8 17 23-11Z"
          fill={p.primary}
          stroke={OUTLINE}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M155 143c14 2 24 10 27 22l-8 17-23-11Z"
          fill={p.primary}
          stroke={OUTLINE}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="70" cy="169" r="3" fill={p.glow} />
        <circle cx="170" cy="169" r="3" fill={p.glow} />

        {/* 左臂 ---------------------------------------------------------- */}
        <path
          d="m62 177-7 34c-1 6 3 10 9 10h8l3-12-12-4 8-26Z"
          fill={p.suit}
          stroke={OUTLINE}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          x="58"
          y="211"
          width="17"
          height="16"
          rx="4"
          fill={p.metal}
          stroke={OUTLINE}
          strokeWidth="4"
        />

        {/* 右臂 ---------------------------------------------------------- */}
        <path
          d="m169 175 9 25 12 8-8 12-15-7-12-30Z"
          fill={p.suit}
          stroke={OUTLINE}
          strokeWidth="5"
          strokeLinejoin="round"
        />

        {/* 初始武器轮廓 -------------------------------------------------- */}
        {!hud && isSunset ? (
          <g className="programmer-avatar__weapon" transform="rotate(-9 190 200)">
            <path
              d="M160 193h52l10 7v11l-10 7h-52l-8-6v-13Z"
              fill={p.metal}
              stroke={OUTLINE}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <rect x="177" y="196" width="23" height="7" rx="1" fill={p.secondary} stroke={OUTLINE} strokeWidth="2" />
            <path d="m175 218 6 15h13l-4-15" fill={p.suit} stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
            <path d="M212 198h14v6h-14" fill={p.glow} stroke={OUTLINE} strokeWidth="2" />
            <circle cx="185" cy="200" r="3" fill={p.glow} />
          </g>
        ) : null}

        {!hud && isSimon ? (
          <g className="programmer-avatar__weapon" transform="rotate(-13 174 200)">
            <path
              d="M154 192h42l10 7v14l-10 7h-42Z"
              fill={p.metal}
              stroke={OUTLINE}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <rect x="196" y="196" width="12" height="20" rx="2" fill={OUTLINE} />
            <circle cx="202" cy="200" r="3" fill={p.glow} />
            <circle cx="202" cy="212" r="3" fill={p.glow} opacity="0.6" />
            <path d="m160 220 6 12h14l-4-12" fill={p.secondary} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
          </g>
        ) : null}

        <circle cx="178" cy="210" r="9" fill={p.metal} stroke={OUTLINE} strokeWidth="4" />

        {/* 头部 ---------------------------------------------------------- */}
        <rect
          x="108"
          y="126"
          width="24"
          height="14"
          rx="4"
          fill={p.metal}
          stroke={OUTLINE}
          strokeWidth="4"
        />
        <path
          d="M74 84c0-28 20-44 46-44s46 16 46 44v26c0 16-11 26-27 26H101c-16 0-27-10-27-26Z"
          fill={p.primary}
          stroke={OUTLINE}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M88 63c10-13 22-18 32-18s22 5 32 18"
          fill="none"
          stroke={p.secondary}
          strokeWidth="6"
          opacity={isJunyi ? 0.3 : 0.9}
          strokeLinecap="round"
        />

        {/* 护目镜 / 面罩 ------------------------------------------------- */}
        <path
          d="M84 82c10-7 23-10 36-10s26 3 36 10l-2 22c-10 8-22 11-34 11s-24-3-34-11Z"
          fill={isJunyi ? DEEP : p.visor}
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {!isJunyi ? (
          <>
            <path
              d="M92 87c8-4 17-6 28-6s20 2 28 6"
              fill="none"
              stroke={p.glow}
              strokeWidth="3"
              opacity="0.8"
              strokeLinecap="round"
            />
            <rect x="99" y="92" width="11" height="3" rx="1.5" fill={p.glow} />
            <rect x="130" y="92" width="11" height="3" rx="1.5" fill={p.glow} />
          </>
        ) : (
          <path
            d="M101 91h15m8 0h15"
            stroke="#75847d"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}
        <rect
          x="99"
          y="113"
          width="42"
          height="13"
          rx="4"
          fill={p.metal}
          stroke={OUTLINE}
          strokeWidth="3"
        />
        <path d="M106 118h12m4 0h12" stroke={p.primary} strokeWidth="2" opacity="0.55" />
        <rect
          x="61"
          y="86"
          width="13"
          height="22"
          rx="4"
          fill={p.metal}
          stroke={OUTLINE}
          strokeWidth="3.5"
        />
        <rect
          x="166"
          y="86"
          width="13"
          height="22"
          rx="4"
          fill={p.metal}
          stroke={OUTLINE}
          strokeWidth="3.5"
        />
        <circle cx="67.5" cy="97" r="3" fill={p.glow} opacity={isJunyi ? 0.25 : 0.9} />
        <circle cx="172.5" cy="97" r="3" fill={p.glow} opacity={isJunyi ? 0.25 : 0.9} />

        {/* 夕阳针：针形发卡 + 补丁夹克 + 故障扫描线 -------------------- */}
        {isSunset ? (
          <g className="programmer-avatar__sunset">
            <g transform="rotate(-16 92 56)">
              <path
                d="M86 64 64 20l13-2 22 42Z"
                fill={p.secondary}
                stroke={OUTLINE}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="m97 66-14-36 8-2 16 34Z"
                fill={p.primary}
                stroke={OUTLINE}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <circle cx="84" cy="58" r="5" fill={p.visor} stroke={OUTLINE} strokeWidth="2.5" />
            </g>
            {!hud ? (
              <>
                <path
                  d="M93 166h21v15H93Z"
                  fill={p.secondary}
                  opacity="0.8"
                  stroke={OUTLINE}
                  strokeWidth="2"
                />
                <path
                  d="M96 169v9m5-9v9m5-9v9"
                  stroke={OUTLINE}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                <path
                  d="M128 184h15v11h-15Z"
                  fill={p.visor}
                  opacity="0.55"
                  stroke={OUTLINE}
                  strokeWidth="2"
                />
                <g className="programmer-avatar__glitch">
                  <rect x="91" y="191" width="56" height="2.5" fill={p.glow} opacity="0.85" />
                  <rect x="99" y="199" width="40" height="2" fill={p.secondary} opacity="0.75" />
                  <rect x="88" y="207" width="30" height="2" fill={p.glow} opacity="0.55" />
                  <rect x="139" y="188" width="7" height="7" fill={p.primary} opacity="0.8" />
                </g>
              </>
            ) : null}
          </g>
        ) : null}

        {/* Simon：贴胶带终端 + 线缆细节 -------------------------------- */}
        {isSimon && !hud ? (
          <g className="programmer-avatar__simon">
            <path
              d="M146 154c12-4 20 0 24 10"
              fill="none"
              stroke={p.glow}
              strokeWidth="3"
              opacity="0.75"
            />
            <rect
              x="100"
              y="158"
              width="42"
              height="31"
              rx="2"
              fill={DEEP}
              stroke={p.metal}
              strokeWidth="3"
            />
            <rect x="105" y="163" width="32" height="19" fill={p.glow} opacity="0.14" />
            <path
              d="M108 168h19m-19 5h13m-13 5h23"
              stroke={p.visor}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path d="m95 157 9 8m37-8-9 8" stroke={p.secondary} strokeWidth="6" opacity="0.78" />
            <path d="m95 188 9-7m28 7-9-7" stroke={p.secondary} strokeWidth="5" opacity="0.62" />
          </g>
        ) : null}

        {/* 头部小天线 ---------------------------------------------------- */}
        {isSimon ? (
          <g>
            <path d="M84 48 77 26" stroke={p.metal} strokeWidth="5" strokeLinecap="round" />
            <circle cx="76" cy="24" r="5" fill={p.glow} stroke={OUTLINE} strokeWidth="2.5" />
          </g>
        ) : null}

        {/* Junyi：问号工牌 + 未实装剪影 -------------------------------- */}
        {isJunyi ? (
          <g className="programmer-avatar__junyi">
            <path
              d="M99 147c-4 3-6 8-6 14v18"
              fill="none"
              stroke="#7c8a83"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M141 147c4 3 6 8 6 14v18"
              fill="none"
              stroke="#7c8a83"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <rect
              x="99"
              y="164"
              width="42"
              height="34"
              rx="3"
              fill="#1a2420"
              stroke="#9aa89f"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />
            <text
              x="120"
              y="189"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="25"
              fontWeight="700"
              fill="#c9d2cc"
            >
              ?
            </text>
          </g>
        ) : null}

        {/* 细节刻度 ------------------------------------------------------ */}
        {detailed ? (
          <g className="programmer-avatar__marks" stroke={p.glow} strokeWidth="2" opacity="0.5">
            <path d="M28 74h16M28 74v16" fill="none" />
            <path d="M212 236h-16M212 236v16" fill="none" />
            <path d="M28 258h12M28 258v-12" fill="none" />
            <path d="M212 54h-12M212 54v12" fill="none" />
            <circle cx="120" cy="30" r="3" fill="none" />
            <text
              x="120"
              y="331"
              textAnchor="middle"
              fill={p.glow}
              stroke="none"
              fontFamily="var(--font-mono)"
              fontSize="8"
              letterSpacing="2"
            >
              UNIT // {character.callsign}
            </text>
          </g>
        ) : null}
      </g>
    </svg>
  );
}
