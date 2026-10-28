import type { GameIconDefinition } from './types';

export const WEAPON_ICONS_A = {
  pulseNailer: {
    content: (
      <>
        <path
          d="M4.2 9.3H12.8l1.8 1.4v2.7l-1.8 1.3H4.2Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M4.2 9.3H12.8l1.8 1.4v2.7l-1.8 1.3H4.2Z" />
        <path d="M6.3 7.2h4.2v2.1H6.3Z" />
        <path d="M6.8 14.5 5.2 19.8H8l1.5-5.3Z" />
        <path d="M11.2 14.7c0 1.5-.9 2.4-2.2 2.4" />
        <path d="M14.6 10.8h4.2v2.5h-4.2" />
        <path d="M19.6 9.8c1 1.6 1 3.8 0 5.4" />
      </>
    ),
  },
  scatterRivets: {
    content: (
      <>
        <path
          d="M4.2 9.7h9.4l3.8-2.9v10.4l-3.8-2.9H7.7L6.2 19H3.9l.3-4.7Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M4.2 9.7h9.4l3.8-2.9v10.4l-3.8-2.9H7.7L6.2 19H3.9l.3-4.7Z" />
        <path d="M7.2 9.7v6.4M10.8 9.7v6.4" />
        <circle cx="15.1" cy="9.3" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="16.1" cy="12" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="15.1" cy="14.7" r="0.75" fill="currentColor" stroke="none" />
        <path d="M18.2 8.4 20.7 6.6M19 12h2.6M18.2 15.6l2.5 1.8" />
        <path d="M8.1 16.3c0 1.3.8 2.1 2 2.1" />
      </>
    ),
  },
  arcHammer: {
    content: (
      <>
        <path
          d="M8.2 4.3h11.5l1.1 1.1v3.5l-1.1 1H8.2Z"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <path d="M8.2 4.3h11.5l1.1 1.1v3.5l-1.1 1H8.2Z" />
        <path d="M12.9 9.9 6.3 19.3M15.7 9.9 9.1 19.3" />
        <path d="M19.9 12.3c.9 1.1.9 2.6 0 3.7" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
