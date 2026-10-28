import type { GameIconDefinition } from './types';

export const RISK_ICONS_A = {
  overclock: {
    content: (
      <>
        <path
          d="M3.2 8.8h3.2v1.8h9.6v-1.4h3.2l1.2-1.2v8.2l-1.2-1.2h-3.2v-1.4H6.4v1.8H3.2Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M3.2 8.8h3.2v1.8h9.6v-1.4h3.2l1.2-1.2v8.2l-1.2-1.2h-3.2v-1.4H6.4v1.8H3.2Z" />
        <path d="M8.2 10.6V7.2M11 10.6V7.2" />
        <circle cx="19.2" cy="12.1" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  overdrive: {
    content: (
      <>
        <circle cx="13.4" cy="12" r="5.6" fill="currentColor" opacity="0.12" stroke="none" />
        <circle cx="13.4" cy="12" r="5.6" />
        <path d="M14.96 10.44 17.36 8.04M14.96 13.56 17.36 15.96M11.84 13.56 9.44 15.96M11.84 10.44 9.44 8.04" />
        <circle cx="13.4" cy="12" r="2.2" fill="currentColor" opacity="0.2" stroke="none" />
        <circle cx="13.4" cy="12" r="2.2" />
        <path d="M3.2 9.4h3.2M3.2 14.6h2.4" opacity="0.6" />
      </>
    ),
  },
  heavyArmor: {
    content: (
      <>
        <path
          d="M5.6 3.4h12.8l1.2 1.2v5.8c0 5-3 8.4-7.6 10.2-4.6-1.8-7.6-5.2-7.6-10.2V4.6Z"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <path d="M5.6 3.4h12.8l1.2 1.2v5.8c0 5-3 8.4-7.6 10.2-4.6-1.8-7.6-5.2-7.6-10.2V4.6Z" />
        <path d="M8.2 6.4h7.6v4c0 3.1-2 5.4-3.8 6.6-1.8-1.2-3.8-3.5-3.8-6.6Z" />
        <path d="M12 6.4v9.6" />
        <circle cx="7.4" cy="5.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="16.6" cy="5.2" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
