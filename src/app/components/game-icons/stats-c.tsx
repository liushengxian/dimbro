import type { GameIconDefinition } from './types';

export const STAT_ICONS_C = {
  pickup: {
    content: (
      <>
        <path
          d="M5.4 4v6.4a6.6 6.6 0 0 0 13.2 0V4ZM3.5 3.4h3.8v3.4H3.5ZM16.7 3.4h3.8v3.4h-3.8Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M5.4 4v6.4a6.6 6.6 0 0 0 13.2 0V4" />
        <path d="M3.5 3.4h3.8v3.4H3.5zM16.7 3.4h3.8v3.4h-3.8z" />
      </>
    ),
  },
  range: {
    content: (
      <>
        <path d="M5.2 12h4.8M14 12h4.8" strokeDasharray="2.4 2.4" />
        <path d="M7 8.6 3.8 12 7 15.4M17 8.6 20.2 12 17 15.4" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  coin: {
    content: (
      <>
        <g transform="rotate(-10 11.6 13.8)">
          <ellipse
            cx="11.6"
            cy="16"
            rx="5.9"
            ry="2.1"
            fill="currentColor"
            opacity="0.12"
            stroke="none"
          />
          <ellipse cx="11.6" cy="16" rx="5.9" ry="2.1" />
          <path d="M5.7 16v-2.2M17.5 16v-2.2" />
          <ellipse cx="11.6" cy="13.8" rx="5.9" ry="2.1" />
          <path d="M5.7 13.8v-2.2M17.5 13.8v-2.2" />
          <ellipse cx="11.6" cy="11.6" rx="5.9" ry="2.1" />
        </g>
        <path
          d="M17.9 4.2 18.52 5.58 19.9 6.2 18.52 6.82 17.9 8.2 17.28 6.82 15.9 6.2 17.28 5.58Z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
        <path d="M17.9 4.2 18.52 5.58 19.9 6.2 18.52 6.82 17.9 8.2 17.28 6.82 15.9 6.2 17.28 5.58Z" />
      </>
    ),
  },
  knockback: {
    content: (
      <>
        <path d="M9.2 3.4h5.6M12 3.4v8.6" />
        <rect
          x="5.2"
          y="12"
          width="13.6"
          height="3.6"
          rx="1"
          fill="currentColor"
          opacity="0.15"
          stroke="none"
        />
        <rect x="5.2" y="12" width="13.6" height="3.6" rx="1" />
        <path d="M5.8 16.4c1.5 2.9 10.9 2.9 12.4 0" opacity="0.8" />
        <path d="M4 17.8c2.3 2.9 13.7 2.9 16 0" opacity="0.55" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
