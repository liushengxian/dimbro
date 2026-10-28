import type { GameIconDefinition } from './types';

export const MODULE_ICONS_B = {
  compositeArmor: {
    content: (
      <>
        <path
          d="M6.1 14.4 20.1 10.8V8.3L13.1 4.2 6.1 8.3Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M4.7 13 18.7 9.4v6.4l-7 4.1-7-4.1Z" />
        <path d="M4.7 13 6.1 14.4" />
        <path d="M18.7 9.4 20.1 10.8" />
        <path d="M6.1 14.4 20.1 10.8V8.3L13.1 4.2 6.1 8.3Z" />
      </>
    ),
  },
  emergencyBattery: {
    content: (
      <>
        <rect x="3.4" y="7.2" width="15.2" height="9.6" rx="2.4" />
        <rect x="18.6" y="10.2" width="1.5" height="3.6" rx="0.8" />
        <path
          d="M12.4 9 7.8 13h3.2l-1.1 1.9 4.6-4h-3.2Z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
        <path
          d="M12.4 9 7.8 13h3.2l-1.1 1.9 4.6-4h-3.2Z"
          strokeWidth="1.5"
        />
      </>
    ),
  },
  repairArm: {
    content: (
      <>
        <path
          d="M3.3 20.2 4.5 16h5.1l1.2 4.2Z"
          fill="currentColor"
          opacity="0.14"
          stroke="none"
        />
        <path d="M3.3 20.2 4.5 16h5.1l1.2 4.2Z" />
        <path d="M6.4 16 9.4 12.4" strokeWidth="2.2" />
        <circle
          cx="10.8"
          cy="11.2"
          r="2"
          fill="currentColor"
          opacity="0.16"
        />
        <circle cx="10.8" cy="11.2" r="2" />
        <path d="M12.6 10.6 15.6 10.2" strokeWidth="2.2" />
        <path d="M15.6 10.2Q17.6 6.6 18.9 6.8" strokeWidth="2" />
        <path d="M15.6 10.4Q17.6 14 18.9 13.8" strokeWidth="2" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
