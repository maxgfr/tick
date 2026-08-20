---
name: tick
description: A warm-black instrument with one amber signal — local-first timer suite.
colors:
  amber-signal: '#ffb224'
  amber-strong: '#ffc95e'
  amber-ink: '#1a1409'
  warm-black: '#161412'
  warm-surface: '#1e1c19'
  warm-surface-2: '#292621'
  warm-ink: '#f0ece3'
  warm-ink-2: '#a8a294'
  warm-ink-3: '#767063'
  warm-line: '#34302a'
  paper: '#f6f4ef'
  paper-surface: '#fffefb'
  paper-surface-2: '#ebe8e0'
  paper-ink: '#211e18'
  paper-ink-2: '#5d584d'
  paper-ink-3: '#8d8779'
  paper-line: '#ddd9cf'
  paper-amber: '#f5a623'
  paper-amber-strong: '#8a5a00'
  good: '#6fce8b'
  warn: '#e2b341'
  selection: '#4d3a12'
typography:
  readout:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontWeight: 700
    letterSpacing: 'tight'
    fontFeature: 'tnum'
  readout-card:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: '2.25rem'
    fontWeight: 600
    fontFeature: 'tnum'
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '16px'
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
rounded:
  md: '6px'
  xl: '12px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '24px'
components:
  button-primary:
    backgroundColor: '{colors.amber-signal}'
    textColor: '{colors.amber-ink}'
    rounded: '{rounded.md}'
    padding: '6px 12px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.warm-ink}'
    rounded: '{rounded.md}'
    padding: '6px 12px'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.warm-ink-3}'
    rounded: '{rounded.md}'
    padding: '6px 12px'
  card-timer:
    backgroundColor: '{colors.warm-surface}'
    textColor: '{colors.warm-ink}'
    rounded: '{rounded.xl}'
    padding: '16px'
---

# Design System: tick

## Overview

**Creative North Star: "The Warm-Black Instrument"**

tick descends from displays that had to be read across a room, in bad light, at
a glance: darkrooms, split-flap boards, stopwatch dials. The world is that
instrument turned into an interface — warm black (or warm paper in daylight) as
the ground, tick marks because instruments mark, numerals in a mono face
because time is measurement, and exactly one amber signal for whatever is live.
It refuses the two neighboring defaults: the gradient-ring focus-app dashboard
and the white minimalist clock clone. There is no glass, no glow, no gradient;
the dial carries the design and the amber says "running."

Density is operational: tool pages are a single centered column of working
controls, the home is a grid of eight keyed entries, and the fullscreen display
is one number as large as the viewport allows. The instrument metaphor extends
to the browser chrome itself — selection, caret, scrollbar and the PWA
title-bar color all take tokens.

**Key Characteristics:**

- Warm-black ground, one amber signal — amber appears only on what is live,
  done, or focused, never as decoration.
- Stopwatch bezels everywhere: 60-tick dials and linear tick rulers are the
  only progress vocabulary; no bars, no rings without ticks, no fills without
  marks.
- Mono numerals with tabular figures — digits hold their columns while the
  value runs.
- Flat: depth comes from tonal steps (`bg` → `surface` → `surface-2`) and 1px
  lines, never shadows.
- One authored motion: the breathing colon at 1 Hz on the fullscreen display;
  nothing else in the app blinks.

## Colors

One accent over two warm neutrals — a night set (default identity) and a paper
set (light theme) — mirrored automatically by `prefers-color-scheme`. Canonical
values live in `src/components/tokens.css`; dark values below are the signature
set.

### Primary

- **Amber Signal** (#ffb224 dark / #f5a623 light): the single live color —
  running arcs, elapsed ruler ticks, focus outline, done states, the display
  phase label. Its rarity is the point.

### Secondary

- **Amber Strong** (#ffc95e dark / #8a5a00 light): hover/active shift for amber
  elements where plain amber would lose contrast.
- **Amber Ink** (#1a1409 dark / #211e18 light): text on amber fills.

### Neutral

- **Warm Black** (#161412): page ground, dark theme.
- **Warm Surface** (#1e1c19): raised cards and panels, dark theme.
- **Warm Surface 2** (#292621): inactive dial tracks and wells.
- **Warm Ink** (#f0ece3): primary text, dark theme.
- **Warm Ink 2** (#a8a294): secondary text, labels, taglines.
- **Warm Ink 3** (#767063): tertiary text, major ruler ticks, quiet actions.
- **Warm Line** (#34302a): 1px borders and minor ruler ticks.
- **Paper set** (#f6f4ef ground, #fffefb surface, #ebe8e0 surface-2, #211e18 /
  #5d584d / #8d8779 inks, #ddd9cf line): the same roles for the light theme —
  a paper dial in a daylight kitchen.

### Named Rules

**The One Signal Rule.** Amber marks exactly one thing per glance: what is
live, done, or focused. If a second element wants amber, one of them is wrong.

**The Warm-Only Rule.** Neutrals are warm blacks and warm papers, never pure
gray and never blue-black. Time instruments glow warm; dashboards go cool.

## Typography

**Display Font:** Spline Sans Mono (self-hosted woff2, weights 500 and 700;
fallback ui-monospace, SF Mono, Menlo, Consolas)
**Body Font:** system-ui, -apple-system, Segoe UI, Roboto, sans-serif

**Character:** one mono face for everything measured, the OS voice for
everything said. No serif, no second display face — a mono with tabular
figures is the instrument's prerequisite.

### Hierarchy

- **Readout** (700, `clamp(3rem, 16vmin, 7rem)` on the display, `22vmin` for
  the wall clock; tabular figures): the big numbers — countdown, interval
  phase, clock.
- **Card readout** (600, 36px; tabular figures): timer-card readouts and lap
  columns, via the `.tnum` class.
- **Title** (700, 24px): tool page headings.
- **Body** (400, 16px/1.5): descriptions, forms, settings.
- **Label** (500, 14px): buttons, taglines, captions; uppercase appears only
  in display phase labels (READY, WORK, REST, COOL).

### Named Rules

**The Numerals Don't Dance Rule.** Every numeric readout uses the display face
with tabular figures (`.tnum`). Digits hold their columns while the value runs;
a proportional figure in a readout is a defect.

## Layout

Tool pages are a single centered column (`max-w-3xl`, 16px side padding) under
a header of back-link, name and tagline. The home grid and every list stack
vertically with 16–24px rhythm. The fullscreen display centers its content in
the full viewport (`min-h-dvh`) and sizes the readout by `vmin`, so the number,
not the layout, responds to the screen. Keyboard digits 1–8 jump between tools;
hash routing keeps deep links (`#/interval`) shareable under the `/tick/` base.

## Elevation & Depth

Flat by design — no shadows anywhere in the app. Depth is tonal: page ground →
surface (cards) → surface-2 (tracks and wells), each step one warm tone darker
(or lighter on paper), and separation is carried by 1px lines. The amber focus
outline (2px, 2px offset) is the only thing allowed to sit "on top" of a
surface.

### Named Rules

**The Flat Rule.** No `box-shadow`, ever. If a surface needs to feel raised,
give it `surface` over `bg` and a `line` border — or it does not need to feel
raised.

## Shapes

Corners are quiet: 12px on cards and containers, 6px on buttons and controls.
The geometry that identifies the system is not rounded rectangles but
instruments — circles (the dial: a 60-tick bezel, one in five ticks tall,
around an amber arc) and linear tick rulers (minor tick every 2.5%, major every
10%, an amber twin layer clipped to the elapsed fraction). Both are marked,
not filled: elapsed time is drawn in amber ticks over a ticked track.

## Components

Every component is quiet until it is live.

### Buttons

- **Shape:** 6px radius, `6px 12px` padding, 14px/500 label.
- **Primary:** amber fill, amber-ink text — the one loud button per view
  (Start).
- **Ghost (default):** transparent, 1px line border, ink text.
- **Danger:** borderless, ink-3 text (Remove) — quiet enough to sit in a card
  row, distinguishable by label and position.
- **Hover/Focus:** color transitions only; focus is the 2px amber outline.

### Cards / Containers

- **Corner Style:** 12px radius.
- **Background:** `surface` over the `bg` ground, 1px `line` border; the border
  turns amber when the card's timer is done.
- **Shadow Strategy:** none (The Flat Rule).
- **Internal Padding:** 16px.

### Inputs / Fields

- **Style:** `surface` fill, 1px `line` border, 6px radius, body type.
- **Focus:** amber caret (global) + 2px amber outline.
- **Numeric fields:** readouts and time inputs use `.tnum`.

### Navigation

Home is the hub: a grid of tool entries, each showing its mono digit key.
Pages carry a "← tick" text link (14px, ink-3) above the title. No persistent
chrome — the app is one tool at a time with the keyboard as the real nav.

### Dial (signature)

An SVG stopwatch bezel: sixty ticks, every fifth full-height and darker,
inscribing a track (`surface-2`) with one amber arc for progress, rotated from
twelve o'clock. Used at 72px on cards and 384px on the display; always sits
next to a text readout carrying the same information (aria-hidden).

### Tick ruler (signature)

A 12px linear bezel in one element (`.tick-ruler`): minor ticks every 2.5%
(bottom half), majors every 10%, and an amber twin layer clipped by
`--progress` via `clip-path: inset(0 calc((1 - var(--progress)) * 100%) 0 0)`.
The elapsed fraction of a timer card, in the instrument's own material.

### Live clock (signature)

Readouts on the fullscreen display split their colons into `.tick-live-sep`
spans that breathe at 1 Hz (`steps(1, end)`, 1 → 0.35 → 1). The one authored
motion in the app; `prefers-reduced-motion: reduce` turns it off.

## Do's and Don'ts

### Do:

- **Do** use amber for live, done, and focused — and nothing else (The One
  Signal Rule).
- **Do** set every numeric readout in `.tnum` (The Numerals Don't Dance Rule).
- **Do** express progress with dials and tick rulers — marks drawn over a
  ticked track.
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
- **Don't** add a progress bar, an unmarked ring, or a plain fill where a tick
  ruler or dial belongs.
- **Don't** animate anything beyond the breathing colon and state-color
  transitions.
- **Don't** use a proportional (non-tabular) figure in a running readout.
- **Don't** load a font or asset from a network origin — assets are
  self-hosted, and the privacy gate fails the build otherwise.
