import type { SVGProps } from 'react';
import type { GameIconDefinition } from './game-icons/types';
import { GAME_ICONS, type GameIconId } from './game-icons/registry';
import { cn } from '../lib/cn';

export interface GameIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: GameIconId;
  size?: number;
}

/**
 * Renders one item icon from the shared 24×24 SVG set. Color is inherited from
 * the card / HUD wrapper, so weapon levels, modules, upgrades and risk cards
 * keep their existing accents and glow.
 */
export function GameIcon({ name, size = 24, className, ...props }: GameIconProps) {
  const definition = (GAME_ICONS as Record<string, GameIconDefinition | undefined>)[name];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('game-icon', className)}
      data-game-icon={name}
      {...props}
    >
      {definition?.content ?? <path d="M12 6.5v7M12 17.5h.01" strokeWidth="2.2" />}
    </svg>
  );
}
