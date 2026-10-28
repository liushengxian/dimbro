import type { SVGProps } from 'react';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'cart'
  | 'check'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'coin'
  | 'crosshair'
  | 'gear'
  | 'heart'
  | 'info'
  | 'lock'
  | 'pause'
  | 'play'
  | 'refresh'
  | 'shield'
  | 'spark'
  | 'trophy'
  | 'volume-off'
  | 'volume-on'
  | 'warning';

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {renderPath(name)}
    </svg>
  );
}

function renderPath(name: IconName) {
  switch (name) {
    case 'arrow-left':
      return (
        <>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case 'chevron-right':
      return <path d="m9 5 7 7-7 7" />;
    case 'cart':
      return (
        <>
          <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" />
          <circle cx="10" cy="20" r="1.2" />
          <circle cx="18" cy="20" r="1.2" />
        </>
      );
    case 'check':
      return <path d="m4 12.5 5 5L20 6.5" />;
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.2 2" />
        </>
      );
    case 'close':
      return (
        <>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </>
      );
    case 'coin':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9" />
          <path d="M15 9.3c-.6-.9-1.7-1.3-3-1.3-1.7 0-2.8.8-2.8 2 0 2.8 6 1.3 6 4.1 0 1.2-1.2 2-3 2-1.4 0-2.6-.5-3.2-1.5" />
        </>
      );
    case 'crosshair':
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </>
      );
    case 'gear':
      return (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
        </>
      );
    case 'heart':
      return (
        <path d="M20 8.6c0 5.2-8 10.4-8 10.4s-8-5.2-8-10.4C4 5.9 6 4 8.5 4c1.6 0 2.8.8 3.5 2 .7-1.2 1.9-2 3.5-2C18 4 20 5.9 20 8.6Z" />
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5" />
          <path d="M12 7.6h.01" strokeWidth="2.6" />
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="5" y="10" width="14" height="9" rx="1.5" />
          <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10" />
          <path d="M12 14v2" />
        </>
      );
    case 'pause':
      return (
        <>
          <path d="M8.5 5v14M15.5 5v14" strokeWidth="2.8" />
        </>
      );
    case 'play':
      return <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />;
    case 'refresh':
      return (
        <>
          <path d="M20 6v5h-5" />
          <path d="M19.2 11A7.5 7.5 0 1 0 20 15" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z" />
          <path d="M9 11.5 11 14l4-4.5" />
        </>
      );
    case 'spark':
      return (
        <>
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
          <path d="m4.9 4.9 3.5 3.5M15.6 15.6l3.5 3.5M19.1 4.9l-3.5 3.5M8.4 15.6l-3.5 3.5" />
        </>
      );
    case 'trophy':
      return (
        <>
          <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
          <path d="M8 5.5H5.5a3 3 0 0 0 3 4.5H9M16 5.5h2.5a3 3 0 0 1-3 4.5H15" />
          <path d="M12 12.5V16M9 20h6M10 16h4v4h-4z" />
        </>
      );
    case 'volume-off':
      return (
        <>
          <path d="M4 9.5h3l4-3.5v12l-4-3.5H4v-5Z" />
          <path d="m16 9 5 6M21 9l-5 6" />
        </>
      );
    case 'volume-on':
      return (
        <>
          <path d="M4 9.5h3l4-3.5v12l-4-3.5H4v-5Z" />
          <path d="M15 8.2a5.5 5.5 0 0 1 0 7.6M18 5.5a9.5 9.5 0 0 1 0 13" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="M12 3.5 21 20H3L12 3.5Z" />
          <path d="M12 9v5" />
          <path d="M12 17.5h.01" strokeWidth="2.6" />
        </>
      );
  }
}
