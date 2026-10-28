import type { ReactNode } from 'react';

/**
 * One game-item icon. The content is rendered inside a 24×24 SVG viewBox by
 * <GameIcon>, so it must not include its own <svg> wrapper, <title>, ids, defs
 * or external references.
 *
 * Primary strokes inherit currentColor from the card/HUD wrapper. Secondary
 * masses should use currentColor with a low opacity fill, not hard-coded colors.
 */
export interface GameIconDefinition {
  content: ReactNode;
}
