import type { GameIconDefinition } from './types';

export const STAT_ICONS_A = {
  dmg: {
    content: (
      <>
        <path
          d="M8.77 7 11.85 9.2 16.03 4.93 14.46 10.98 19.41 11.74 15.16 13.93 17.74 18.89 12.75 15.74 10.78 18.85 9.8 15.51 4.61 16.33 8.56 12.75 5.67 9.51 9.38 10.33Z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
        <path d="M8.77 7 11.85 9.2 16.03 4.93 14.46 10.98 19.41 11.74 15.16 13.93 17.74 18.89 12.75 15.74 10.78 18.85 9.8 15.51 4.61 16.33 8.56 12.75 5.67 9.51 9.38 10.33Z" />
      </>
    ),
  },
  atk: {
    content: (
      <>
        <path
          d="M9.2 6.8a4.2 1.9 0 0 0 8.4 0v8.6a4.2 1.9 0 0 1-8.4 0Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <ellipse cx="13.4" cy="6.8" rx="4.2" ry="1.9" />
        <path d="M9.2 6.8v8.6a4.2 1.9 0 0 0 8.4 0V6.8" />
        <path d="M9.2 12h8.4" />
        <path d="M6.9 9.4a4.5 4.5 0 0 0 0 5.2M4.2 8.2a7.8 7.8 0 0 0 0 7.6" />
      </>
    ),
  },
  move: {
    content: (
      <>
        <path
          d="M10.8 15 16.2 16.8 17.2 19H9.6Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M8.8 3.6 12.8 9l-1.8 6" />
        <circle cx="8.8" cy="3.6" r="1.1" fill="currentColor" stroke="none" />
        <path d="m12.8 9 .2.2" />
        <path d="M10.8 15 16.2 16.8 17.2 19H9.6Z" />
        <path d="M3.8 9.4h2.8M3.8 12.6h2.1M3.8 15.8h2.8" />
      </>
    ),
  },
  armor: {
    content: (
      <>
        <path d="M12 3.6 19.4 6.4v5.3c0 4.5-3 7.7-7.4 9.1-4.4-1.4-7.4-4.6-7.4-9.1V6.4L12 3.6Z" />
        <path
          d="M12 7.6 16.6 9.4v3.2c0 2.6-2 4.6-4.6 5.6-2.6-1-4.6-3-4.6-5.6V9.4L12 7.6Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M12 7.6 16.6 9.4v3.2c0 2.6-2 4.6-4.6 5.6-2.6-1-4.6-3-4.6-5.6V9.4L12 7.6Z" />
        <circle cx="10" cy="10.6" r="0.95" fill="currentColor" stroke="none" />
        <circle cx="14" cy="10.6" r="0.95" fill="currentColor" stroke="none" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
