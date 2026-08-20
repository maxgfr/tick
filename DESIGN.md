---
name: tick
description: A departure board for your own time — slate ground, bone tiles, one vermilion signal; local-first timer suite.
colors:
  vermilion: '#ff5a36'
  vermilion-strong: '#ff7a5c'
  vermilion-ink: '#1a0d09'
  slate: '#151b18'
  slate-surface: '#1c2420'
  slate-surface-2: '#242e29'
  bone: '#ede7d9'
  sage-2: '#a8b0a6'
  sage-3: '#747d74'
  slate-line: '#2c3630'
  tile: '#ece5d3'
  tile-ink: '#1d231f'
  seam: '#00000038'
  selection: '#43211a'
  paper: '#f0ebde'
  paper-vermilion: '#e8431f'
  paper-tile: '#232a26'
typography:
  readout:
    fontFamily: "'IBM Plex Sans Condensed', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontWeight: 600
    fontFeature: 'tnum'
  readout-display:
    fontFamily: "'IBM Plex Sans Condensed', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: 'clamp(3rem, 16vmin, 7rem)'
    fontWeight: 600
    fontFeature: 'tnum'
  label:
    fontFamily: "'IBM Plex Sans Condensed', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 600
    letterSpacing: 'wide'
    textTransform: 'uppercase'
  body:
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '16px'
    lineHeight: 1.5
rounded:
  xs: '2px'
  cell: '1px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '24px'
components:
  button-primary:
    backgroundColor: '{colors.vermilion}'
    textColor: '{colors.vermilion-ink}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.bone}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.sage-3}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  card-timer:
    backgroundColor: '{colors.slate-surface}'
    textColor: '{colors.bone}'
    rounded: '{rounded.xs}'
    padding: '16px'
---

# Design System: tick

## Overview

**Creative North Star: "The Board"**

tick descends from the split-flap departure board: rows of tiles that flip to
their next truth, read from across a station hall by people who cannot stop
walking. The interface is that board turned inward — time as printed matter.
Slate-green ground, bone tiles, a condensed grotesque for everything measured,
and exactly one vermilion signal for whatever is "now". It refuses the two
neighboring defaults: the gradient-ring focus app and the white minimalist
clock clone. There is no glass, no glow, no gradient, no circle; the board
carries the design, and the vermilion says "now".

The app opens straight on the countdowns — there is no home, no landing pitch.
A slim persistent bar carries the wordmark and the eight tools; every page is
one centered column of working controls; the fullscreen display is one number
as large as the viewport allows. Progress is never a bar or a ring: it is a
row of small tiles filling with vermilion, the board spending itself.

**Key Characteristics:**

- Slate ground, bone tiles, one vermilion signal — vermilion appears only on
  what runs, what is done, or what is focused, never as decoration.
- Tiles are the unit: digits live on tiles, progress is a row of tiles, the
  metronome's beats are tiles.
- The condensed grotesque (IBM Plex Sans Condensed) for everything measured
  or labelled; IBM Plex Sans for everything said.
- Flat: depth comes from tonal steps (`bg` → `surface` → `surface-2`) and 1px
  lines, never shadows.
- One authored motion: the mechanical flip of the digit that changes; nothing
  else in the app moves.

## Colors

One signal over one material — a night set (default identity) and a daylight
set that is the same board with the material inverted — mirrored automatically
by `prefers-color-scheme`. Canonical values live in
`src/components/tokens.css`; dark values below are the signature set.

### Primary

- **Vermilion** (#ff5a36 dark / #e8431f light): the single "now" color —
  filled progress tiles, running metronome beats, focus outline, done states,
  the display phase label. Its rarity is the point.

### Secondary

- **Vermilion Strong** (#ff7a5c dark / #c33417 light): hover/active shift for
  vermilion elements where flat vermilion would lose contrast.
- **Vermilion Ink** (#1a0d09 dark / #fff6f2 light): text on vermilion fills.

### Neutral

- **Slate** (#151b18): page ground, dark theme — green-blacked, never pure
  gray, never blue-black.
- **Slate Surface** (#1c2420): raised cards and panels, dark theme.
- **Slate Surface 2** (#242e29): wells, empty progress cells, quiet fills.
- **Bone** (#ede7d9): primary text, dark theme.
- **Sage 2** (#a8b0a6): secondary text, labels, taglines.
- **Sage 3** (#747d74): tertiary text, quiet actions (Remove, back-links).
- **Slate Line** (#2c3630): 1px borders and hairlines.
- **Tile** (#ece5d3) / **Tile Ink** (#1d231f) / **Seam** (rgba black at 22%):
  the flap material — a bone plate, its slate glyph, the 1px hinge line
  across the middle.
- **Paper set** (#f0ebde ground, #f6f2e7 surface, #e5dfcf surface-2, #1d231f /
  #5d6660 / #8d948d inks, #d9d2bf line, tile #232a26): the same board in
  daylight — the material inverts, the roles do not.

### Named Rules

**The Signal Tile Rule.** Vermilion marks exactly one thing per glance: what
runs, is done, or is focused. If a second element wants vermilion, one of them
is wrong.

**The Inverted Material Rule.** The light theme is the same board with its
material inverted — paper ground, slate tiles — not a second palette. Roles
never change sides between themes.

## Typography

**Display Font:** IBM Plex Sans Condensed (self-hosted woff2, weights 500,
600, 700; fallback Avenir Next Condensed, Arial Narrow, system-ui)
**Body Font:** IBM Plex Sans (self-hosted woff2, weights 400 and 500;
fallback system-ui)

**Character:** the condensed grotesque of platform signage for everything
measured or labelled — readouts, headings, buttons, the wordmark — with
tabular figures as a seat belt; the plain grotesque for sentences. No serif,
no mono, no second display face.

### Hierarchy

- **Readout** (600, on tiles; `clamp(3rem, 16vmin, 7rem)` on the display,
  `clamp(4rem, 22vmin, 10rem)` for the wall clock): the big numbers —
  countdown, interval phase, clock, laps.
- **Title** (600, 24px, uppercase, wide tracking): tool page headings.
- **Body** (400, 16px/1.5): descriptions, forms, settings.
- **Label** (600, 14px, uppercase, wide tracking): buttons, nav links,
  taglines, phase chips. Uppercase is the norm, carried by CSS
  `text-transform` so accessible names stay intact.

### Named Rules

**The Digits Don't Dance Rule.** Every digit sits on its own tile: the tile
fixes the column, not just `tnum`. A readout too small for tiles (an input, a
table cell) still uses the condensed face with tabular figures via `.tnum`.
A running digit column that shifts is a defect, at any size.

## Layout

A slim persistent top bar (48px, sticky) carries the wordmark, the eight
tools, and Settings; the active tool is underlined 2px in vermilion, derived
from the parsed route. Tool pages are a single centered column (`max-w-3xl`,
16px side padding) under a heading and tagline; the fullscreen display has no
bar at all and sizes its readout by `vmin`, so the number, not the layout,
responds to the screen. Keyboard digits 1–8 jump between tools; hash routing
keeps deep links (`#/interval`) shareable under the `/tick/` base, and `#/`
is the countdown — the app's front door.

## Elevation & Depth

Flat by design — no shadows anywhere in the app. Depth is tonal: page ground
→ surface (cards) → surface-2 (wells and empty cells), each step one tone
over, and separation is carried by 1px lines. The vermilion focus outline
(2px, 2px offset) is the only thing allowed to sit "on top" of a surface;
the flap's seam is a line, not a shadow.

### Named Rules

**The Flat Rule.** No `box-shadow`, ever. If a surface needs to feel raised,
give it `surface` over `bg` and a `line` border — or it does not need to feel
raised.

## Shapes

Corners are nearly sharp: 2px (`rounded-xs`) on cards, buttons, inputs,
tiles; 1px on progress cells. The geometry that identifies the system is the
tile — a plate taller than wide (0.84em × 1.3em) with a 1px seam across its
middle — and its miniature, the 8px progress cell. Zero circles: no rings, no
dials, no rounded-full. The board is rectilinear; anything round reads as a
different machine.

## Components

Every component is quiet until it is live.

### Buttons

- **Shape:** 2px radius, `6px 12px` padding (sm) or `10px 20px` (lg),
  14px/600 uppercase label in the condensed face.
- **Primary:** vermilion fill, vermilion-ink text — the one loud button per
  view (Start, Dismiss).
- **Ghost (default):** transparent, 1px line border, bone text.
- **Danger:** borderless, sage-3 text (Remove) — quiet enough to sit in a
  card row, distinguishable by label and position.
- **Hover/Focus:** color transitions only; focus is the 2px vermilion
  outline.

### Chips

- **Style:** presets and day toggles are `surface` chips with a 1px line
  border, 2px radius, 13px/500.
- **State:** selected takes bone-on-slate inversion (or vermilion when it
  means "running"); never a fill that competes with the signal.

### Cards / Containers

- **Corner Style:** 2px radius.
- **Background:** `surface` over the `bg` ground, 1px `line` border; the
  border and readout turn vermilion when the card's timer is done.
- **Shadow Strategy:** none (The Flat Rule).
- **Internal Padding:** 16px.

### Inputs / Fields

- **Style:** `surface` fill, 1px `line` border, 2px radius, body type.
- **Focus:** vermilion caret (global) + 2px vermilion outline.
- **Numeric fields:** durations and times use `.tnum`; errors surface in an
  `aria-live` region, never only in color.

### Navigation

The top bar is the whole nav: wordmark to `#/`, then the eight tools and
Settings as uppercase condensed links (48px row, horizontally scrollable on
narrow screens). `aria-current="page"` underlines the active link 2px in
vermilion. The fullscreen display drops the bar — its only way back is the
"← tick" link. The keyboard is the real nav (digits 1–8, `?` for help).

### FlipReadout (signature)

The readout: each character on its own bone tile with the hinge seam; `:` and
`.` are bare separators in the same voice. The visible row is `aria-hidden`
and paired with one `sr-only` twin carrying the whole string, so screens
readers hear "1:00", not "one colon zero zero". When the value changes, only
the tiles whose character changed remount (keyed remount) and flip.

### TileRow (signature)

Progress as a row of small tiles: `cells` 8px cells at 1px radius, 2px apart,
empty cells in `surface-2`, filled cells in vermilion, `filled` rounded to
the nearest whole tile. Used for countdown cards (24 cells), interval phases,
and the display. Never a bar, never a ring — the unit is the tile.

### Named Rules

**The One Motion Rule.** The flap flip (`flap-turn`, 260ms, `steps(6, end)` —
a half-turn through 90°, quantized like a motor stepping through its cams) is
the only animation in the app. Everything else changes by state-color
transition. `prefers-reduced-motion: reduce` turns the flip into an instant
change; no motion is ever load-bearing.

## Do's and Don'ts

### Do:

- **Do** use vermilion for running, done, and focused — and nothing else
  (The Signal Tile Rule).
- **Do** put every running digit on a tile, or at minimum in `.tnum` (The
  Digits Don't Dance Rule).
- **Do** express progress as a TileRow — tiles filling with vermilion.
- **Do** pull every color, font, and radius from `src/components/tokens.css`;
  the browser chrome (selection, caret, scrollbar, title bar) takes the same
  tokens.
- **Do** size display readouts by `vmin`/`clamp`, so the number owns the
  viewport.
- **Do** honor `prefers-reduced-motion` and `prefers-color-scheme`.

### Don't:

- **Don't** add shadows, gradients, glass, or glow (The Flat Rule).
- **Don't** introduce a second accent color, a cool/gray neutral, or a pure
  white.
- **Don't** add a progress bar, an arc, a ring, or a dial — or any circle at
  all — where a TileRow belongs.
- **Don't** animate anything beyond the flap flip and state-color transitions
  (The One Motion Rule).
- **Don't** use a proportional (non-tabular) figure in a running readout, or
  a mono face: the condensed grotesque is the voice.
- **Don't** load a font or asset from a network origin — assets are
  self-hosted, and the privacy gate fails the build otherwise.
