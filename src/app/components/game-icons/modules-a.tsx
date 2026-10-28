import type { GameIconDefinition } from './types';

const COOLING_FAN_BLADE =
  'M11.6 9.73 L10.6 4.07 A8.05 8.05 0 0 1 17.17 5.83 C15.5 7.7 14.1 9.0 13.32 10.12 A2.3 2.3 0 0 0 11.6 9.73 Z';

export const MODULE_ICONS_A = {
  coolingFan: {
    content: (
      <>
        <circle cx="12" cy="12" r="2.4" fill="currentColor" opacity="0.18" stroke="none" />
        <circle cx="12" cy="12" r="2.4" />
        {[0, 120, 240].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 12 12)`}>
            <path d={COOLING_FAN_BLADE} fill="currentColor" opacity="0.18" stroke="none" />
            <path d={COOLING_FAN_BLADE} />
          </g>
        ))}
      </>
    ),
  },
  hollowPoint: {
    content: (
      <>
        <path
          d="M19.3 10.7C18 11.2 16.6 11.5 16 12C16.6 12.5 18 12.8 19.3 13.3Z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
        <path d="M4.2 8.4H11.4C14.4 8.4 16.9 9.3 19.3 10.7C18 11.2 16.6 11.5 16 12C16.6 12.5 18 12.8 19.3 13.3C16.9 14.7 14.4 15.6 11.4 15.6H4.2Z" />
      </>
    ),
  },
  servoBearing: {
    content: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="6.3" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="16.94" cy="9.15" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="16.94" cy="14.85" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17.7" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="7.06" cy="14.85" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="7.06" cy="9.15" r="0.85" fill="currentColor" stroke="none" />
        <rect
          x="16.5"
          y="4.9"
          width="3.2"
          height="2"
          rx="0.5"
          transform="rotate(-45 18.1 5.9)"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <rect
          x="16.5"
          y="4.9"
          width="3.2"
          height="2"
          rx="0.5"
          transform="rotate(-45 18.1 5.9)"
        />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
