import type { GameIconDefinition } from './types';

export const STAT_ICONS_B = {
  hp: {
    content: (
      <>
        <rect x="7.6" y="5.3" width="8.8" height="14.3" rx="2.2" />
        <path d="M10.2 5.3V3.5h3.6v1.8" />
        <path d="M12 8.4v5.4M9.3 11.1h5.4" />
        <rect
          x="8.6"
          y="15.9"
          width="6.8"
          height="2.7"
          rx="0.8"
          fill="currentColor"
          opacity="0.15"
          stroke="none"
        />
      </>
    ),
  },
  regen: {
    content: (
      <>
        <path d="M13.81 5.24A7 7 0 0 1 13.81 18.76" />
        <path d="M10.19 18.76A7 7 0 0 1 10.19 5.24" />
        <path d="M15.94 19.33 13.81 18.76 15.37 17.2" />
        <path d="M8.63 6.8 10.19 5.24 8.06 4.67" />
        <path d="M7.7 12.2h2.3l1.2-2.5 1.7 5 1.2-2.5h2.3" />
      </>
    ),
  },
  crit: {
    content: (
      <>
        <circle cx="12" cy="12" r="6.8" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <path d="M18.08 5.92 19.5 4.5M18.08 18.08 19.5 19.5M5.92 18.08 4.5 19.5M5.92 5.92 4.5 4.5" />
      </>
    ),
  },
  critdmg: {
    content: (
      <>
        <circle cx="10.4" cy="13.1" r="5.9" />
        <path d="M10.4 8.8v1.8M10.4 15.6v1.8M6.1 13.1h1.8M14.7 13.1h1.8" />
        <circle cx="10.4" cy="13.1" r="1.1" fill="currentColor" opacity="0.24" stroke="none" />
        <path d="M19.6 12.4V4M16.7 6.9 19.6 4l2.9 2.9" strokeWidth="2" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
