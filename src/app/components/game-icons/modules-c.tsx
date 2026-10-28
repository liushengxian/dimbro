import type { GameIconDefinition } from './types';

export const MODULE_ICONS_C = {
  magneticChassis: {
    content: (
      <>
        <path
          d="M3.4 11.2h17.2l-1.6 4.2H5Z"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <path d="M3.4 11.2h17.2l-1.6 4.2H5Z" />
        <circle cx="6.4" cy="17.6" r="2.3" />
        <circle cx="17.6" cy="17.6" r="2.3" />
        <path d="M8.9 11.2V8.6a3.1 3.1 0 0 1 6.2 0v2.6" />
        <path d="M7.5 9.8h3v1.6h-3Zm6.1 0h3v1.6h-3Z" />
      </>
    ),
  },
  tacticalLens: {
    content: (
      <>
        <circle cx="12" cy="12" r="5.2" fill="currentColor" opacity="0.17" stroke="none" />
        <circle cx="12" cy="12" r="6.6" />
        <path d="M12 8.4v2M12 13.6v2M8.4 12h2M13.6 12h2" />
        <path d="M5.4 9.6H3.7v4.8h1.7M18.6 9.6h1.7v4.8h-1.7" />
      </>
    ),
  },
  coinAmplifier: {
    content: (
      <>
        <circle cx="12" cy="14.4" r="5.8" fill="currentColor" opacity="0.16" stroke="none" />
        <circle cx="12" cy="14.4" r="5.8" />
        <path d="M12 10.1V4.2M9 7.1 12 4.2l3 2.9" />
      </>
    ),
  },
  spareMagazine: {
    content: (
      <>
        <path
          d="M4.3 6.4h8.1c.9 3.1 1.4 6.3 1.7 9.6H6.9C5.8 12.7 5 9.5 4.3 6.4Z"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <path d="M4.3 6.4h8.1c.9 3.1 1.4 6.3 1.7 9.6H6.9C5.8 12.7 5 9.5 4.3 6.4Z" />
        <path d="M6.2 16h8.4v2H6.2Z" />
        <path d="M6.5 6.4v1.4h3.7V6.4" />
        <path d="M6.1 9.7h6.7" />
        <path d="M17.1 13.4h3v4.2h-3Z" />
        <path d="M17.1 13.4v-2.6l1.5-2.6 1.5 2.6v2.6" />
        <path d="M16.8 17.6h3.6" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
