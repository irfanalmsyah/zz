---
name: design-eng
description: Emil Kowalski's UI polish, component design, and animation philosophy, adapted for this project's stack (React 19 + MUI v7 + Emotion, no Tailwind/Framer Motion/Base UI). Use when touching UI code, reviewing a diff for polish, or doing a design pass on a page.
---

# Design Engineering (MUI + Emotion edition)

Adapted from [emilkowalski/skills](https://github.com/emilkowalski/skills)'s `emil-design-eng` skill. The
original assumes Tailwind, Base UI/Radix, and Framer Motion. This project uses **MUI v7 with the Emotion
styling engine, and no animation library** — every rule below is translated to that stack. Don't introduce
Tailwind, Base UI, or Framer Motion to follow this skill; use MUI's `theme`, `sx`, `styled()`, and plain CSS
(`@emotion/react`'s `keyframes`, native `@starting-style`/WAAPI) instead.

## Core philosophy

- **Taste is trained, not innate.** Reverse-engineer why a good interface feels good before copying it.
- **Unseen details compound.** Most polish is never consciously noticed — that's the point. A thousand small correct decisions add up to "this just feels right."
- **Beauty is leverage.** Good defaults and motion are a real differentiator, not decoration for its own sake.

## Review format (when reviewing UI code in this repo)

Use a Before/After/Why markdown table, one row per issue:

| Before | After | Why |
| --- | --- | --- |
| `transition: 'all 300ms'` | `transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)'` | Animate exact properties, use a stronger ease-out |
| `theme.palette.primary.main` default MUI blue everywhere, no active nav state | Themed palette + active-route styling | State indication is a valid reason to add visual weight |
| List items all mount at once | `animation-delay` stagger via `nth-of-type` | Cascading entrance reads as more natural than a single pop |

## The animation decision framework

Before adding any transition/animation, answer in order:

1. **Should this animate at all?** Frequency drives the answer:
   - 100+ times/day (keyboard shortcuts, toggles) → no animation, ever.
   - Tens of times/day (hover, row selection) → remove or drastically shorten.
   - Occasional (dialogs, menus, page-level content swaps) → standard animation.
   - Rare/first-time (empty states, onboarding) → delight is fine.
2. **What's the purpose?** Spatial consistency, state indication, feedback, or preventing a jarring appear/disappear. "It looks cool" is not a purpose if the user sees it often.
3. **Easing:**
   - Entering/exiting → `ease-out`.
   - Moving/morphing in place → `ease-in-out`.
   - Hover/color change → `ease`.
   - Constant motion (progress, marquee) → `linear`.
   - **Never `ease-in`** on UI — it delays the moment the user is watching most closely.
4. **Duration:** stay under 300ms for UI. Button feedback 100-160ms, menus/selects 150-250ms, dialogs 200-500ms.

### Custom easing tokens

MUI's default `theme.transitions.easing` (`cubic-bezier(0.4, 0, 0.2, 1)` etc.) is a reasonable but weak
ease. Define stronger curves once on the theme and reuse them everywhere instead of the MUI defaults:

```js
// theme.js
easing: {
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',   // entrances
  easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)', // on-screen movement
}
```

## Component rules, translated to MUI

### Buttons must feel responsive

MUI's ripple is feedback, but it's not enough on its own. Add a press-scale to `MuiButtonBase` (the base
every `Button`/`IconButton`/`MenuItem`/`Tab` extends) via `theme.components`:

```js
MuiButtonBase: {
  styleOverrides: {
    root: {
      transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)',
      '&:active': { transform: 'scale(0.97)' },
    },
  },
},
```

One override, applies app-wide. Keep the scale subtle (0.95–0.98).

### Popovers/menus are already origin-aware — don't fight it

MUI's `Menu`/`Popover`/`Select` use `Popper` + `Grow`, which already sets `transformOrigin` to the anchor
edge dynamically. Unlike raw Base UI/Radix, you don't need a `--transform-origin` CSS var — just don't
override `transformOrigin` unless you have a specific reason to. **Exception:** `Dialog` (MUI's modal) should
stay centered — that's already MUI's default, leave it.

### Tune menu/select duration, don't rebuild them

Rather than hand-rolling popovers, override `transitionDuration` on `MuiMenu`/`MuiPopover` to land in the
150–250ms band instead of MUI's slower default:

```js
MuiMenu: { defaultProps: { transitionDuration: 180 } },
```

### Never animate from `scale(0)`

If you build a custom entrance (e.g. a card or toast-like element), start from `scale(0.95)` + `opacity: 0`,
never `scale(0)`. Nothing in the real world pops in from nothing.

### Stagger list entrances

For a list that loads together (leaderboard rows, match history cards), stagger a short fade+rise instead of
having every row mount at once:

```js
import { keyframes } from '@emotion/react';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// on each row/card, capped so a long list doesn't get a long tail:
sx={{
  animation: `${fadeInUp} 240ms cubic-bezier(0.23,1,0.32,1) both`,
  animationDelay: `${Math.min(index, 8) * 40}ms`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}}
```

Keep stagger delays to 30–80ms between items; longer reads as slow. This is data that loads occasionally
(page load, game switch) — it qualifies as "standard animation," not "never animate."

### Reduced motion

Add once, globally (e.g. via MUI's `<GlobalStyles>` in `main.jsx`), not per-component:

```js
<GlobalStyles
  styles={{
    '@media (prefers-reduced-motion: reduce)': {
      '*, *::before, *::after': {
        animationDuration: '0.01ms !important',
        transitionDuration: '0.01ms !important',
      },
    },
  }}
/>
```

## Performance rules (still apply with Emotion/CSS)

- Only animate `transform` and `opacity` — they skip layout/paint. Animating `sx={{ width, height, padding }}` transitions triggers full reflow.
- Prefer CSS transitions (interruptible, retarget mid-flight) over `@keyframes` for anything triggered rapidly or repeatedly (e.g. hover states, toggles). Reserve `keyframes` for one-shot entrances like the stagger above.
- No animation library is installed. Don't add Framer Motion for a single spring — WAAPI (`element.animate(...)`) or a CSS transition covers nearly everything here. If a genuinely spring-like, interruptible drag interaction is ever needed, that's the one case where adding `framer-motion` as a real dependency (not just for this) would be justified — raise it explicitly rather than assuming it.

## What this skill deliberately drops from the original

- Swift/SwiftUI, Expo/React Native, gesture/drag-dismiss sections — this is a web-only MUI client, not a
  native or gesture-heavy app.
- Sonner-specific component-library advice — kept only where it generalizes (transitions over keyframes for
  rapid updates).
- `pick-ui-library` guidance — the library choice is already made (MUI); don't suggest swapping to
  shadcn/Base UI/Radix.
