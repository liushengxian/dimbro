import type { GameIconDefinition } from './types';

export const RISK_ICONS_B = {
  greed: {
    content: (
      <>
        <circle cx="8.9" cy="15.2" r="5.1" fill="currentColor" opacity="0.16" stroke="none" />
        <circle cx="8.9" cy="15.2" r="5.1" />
        <path d="M8.9 18.1v-6M7.4 14.3l1.5-1.5 1.5 1.5" />
        <path d="M17.9 3.4v5c0 2.3-1.5 4-3.8 4" />
        <path d="M14.4 12.4c-.9-.2-1.6-.8-2.1-1.6" />
      </>
    ),
  },
  glassCannon: {
    content: (
      <>
        <path
          d="M4.4 14.1V9.9l10.8-.7V8.2H18v7.6h-2.8v-1L4.4 14.1Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M4.4 14.1V9.9l10.8-.7V8.2H18v7.6h-2.8v-1L4.4 14.1Z" />
        <path d="M6.2 9.7v4.6" opacity="0.5" />
        <path d="M9.2 9.5 10.6 11.2 9.3 12.4 10.7 14.4" />
        <path d="M10.6 11.2 12.2 10.3" />
        <path d="M6.6 6.6 8.2 5.3 8.6 7.6Z" fill="currentColor" opacity="0.2" stroke="none" />
        <path d="M6.6 6.6 8.2 5.3 8.6 7.6Z" />
        <path d="M12.4 18.6 14 17.4 14.4 19.6Z" fill="currentColor" opacity="0.2" stroke="none" />
        <path d="M12.4 18.6 14 17.4 14.4 19.6Z" />
      </>
    ),
  },
  shortCircuit: {
    content: (
      <>
        <path
          d="M13.4 3.2 7 12.8h4.6l-1.4 8 6.6-10.4h-4.6Z"
          fill="currentColor"
          opacity="0.16"
          stroke="none"
        />
        <path d="M13.4 3.2 7 12.8h4.6l-1.4 8 6.6-10.4h-4.6Z" />
        <path d="M3.2 10.2h4.2M7.4 10.2l1.4-1.3M7.4 10.2l1.4 1.3" />
        <path d="M20.8 13.8h-4.2M16.6 13.8l-1.4-1.3M16.6 13.8l-1.4 1.3" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
