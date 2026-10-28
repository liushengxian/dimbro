# Game item icons

This folder holds the 24×24 inline-SVG icon set used for weapons, modules,
upgrade cards, risk cards, the shop, and the battle HUD. These replace the
Unicode glyphs that used to be rendered as text.

## Contract

Each group file imports the shared type and exports one object:

```tsx
import type { GameIconDefinition } from './types';

export const EXAMPLE_ICONS = {
  exampleId: {
    content: (
      <>
        <path d="..." />
        <path d="..." fill="currentColor" opacity="0.16" stroke="none" />
      </>
    ),
  },
} satisfies Record<string, GameIconDefinition>;
```

- Do not add an `<svg>` wrapper; `<GameIcon>` supplies the viewBox and stroke.
- Do not edit any file outside your assigned group file.
- Do not add ids, `<defs>`, gradients, masks, filters, text, emoji, images or
  external references. Avoid `<title>`; the host component is `aria-hidden`.
- Keep the icon content inside a 3–21 safe area of the 24×24 viewBox; aim for an
  optical size of roughly 18–20 units.
- Primary drawing: `currentColor`, inherited stroke width 1.8, round caps and
  joins. Secondary accents: `fill="currentColor"` with `opacity` 0.12–0.2.
- Do not hard-code amber/mint/red. The card wrapper supplies the color (weapon
  color, module mint, upgrade amber, risk red).
- Do not use micro-detail: each icon must still read at 14px in the battle HUD.
- Aim for one clear silhouette + one supporting detail. Avoid decorative clutter.

## Visual language

- **Weapons**: right-facing side profile. Muzzle/head points right, grip or
  stock sits lower-left. Keep all five in the same orientation and visual mass.
- **Stats**: centered geometric emblem, usually a device/part plus one symbolic
  mark (crosshair, bolt, shield, battery, magnet, coin). No weapon silhouettes.
- **Modules**: compact component silhouettes (fan, bullet, bearing, plate,
  battery, arm, chassis, lens, chip, magazine) with one low-opacity filled mass.
- **Risk cards**: reuse the base stat idea but add an overloaded/cracked/jagged
  treatment. Keep the drawing monochrome; the risk card's red wrapper supplies
  danger color.
- **Repair**: wrench/plus hybrid, readable at HUD size.

## Rendering

`GameIcon` lives at `src/app/components/GameIcon.tsx` and reads the merged
registry. Card-specific colors and glow come from the existing CSS wrappers.
