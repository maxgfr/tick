---
name: tick
description: A darkroom enlarger timer under a safelight — the lamp touches everything except the figure; local-first timer suite.
colors:
  safelight: '#e0402a'
  safelight-strong: '#ff5c42'
  safelight-ink: '#1a0708'
  dark-bg: '#120b0c'
  dark-surface: '#1a1011'
  dark-surface-2: '#241618'
  dark-line: '#2e1c1e'
  luminous: '#e9e7d3'
  lit-2: '#a8968f'
  lit-3: '#8f7a74'
  cell-dark: '#0c0708'
  cell-light: '#1c1214'
  cell-ink: '#ece6d4'
  cell-edge-dark: '#ffffff14'
  cell-edge-light: '#ffffff1f'
  selection-dark: '#4a1a18'
  enamel-bg: '#efe9e2'
  enamel-surface: '#f6f2ec'
  enamel-surface-2: '#e2dad1'
  enamel-ink: '#191313'
  enamel-ink-2: '#5c4f4c'
  enamel-ink-3: '#726561'
  enamel-line: '#d6cbc2'
  enamel-red: '#bd2d1a'
  enamel-red-strong: '#98220f'
  selection-light: '#f0cabe'
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
  caption:
    fontFamily: "'IBM Plex Sans Condensed', 'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: '0.625rem'
    fontWeight: 600
    letterSpacing: 'wide'
    textTransform: 'uppercase'
rounded:
  xs: '2px'
  cell: '1px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '24px'
components:
  button-primary:
    backgroundColor: '{colors.safelight}'
    textColor: '{colors.safelight-ink}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.luminous}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.lit-3}'
    rounded: '{rounded.xs}'
    padding: '6px 12px'
  card-timer:
    backgroundColor: '{colors.dark-surface}'
    textColor: '{colors.luminous}'
    rounded: '{rounded.xs}'
    padding: '16px'
---

# Design System: tick

## Overview

**Creative North Star: "The Safelight"**

tick is a darkroom enlarger timer. It descends from the one family of
instruments designed to be read in the dark by someone whose hands are busy
and whose eyes have no light to spare — which is, exactly, the product's own
scene: the cook with three pans going, the athlete mid-round, the musician at
a tempo, the phone propped against something across the room.

**The move the whole system turns on: the safelight touches everything except
the figure.** The ground is not a neutral near-black with a red accent laid on
top. It is a room lit red — every surface, hairline and label is warmed by the
lamp — and the luminous figures are the only thing it does not reach. That
inversion is what makes them read as _glowing_ rather than as pale text, and
it is the difference between this world and a competent dark theme.

It refuses three neighbours by construction: the gradient-ring focus app, the
white minimalist clock clone, and the split-flap departure board this project
used to be.

## Colors

Two rooms, one instrument.

**Dark — the safelight is on.** The signature set. `--bg: #120b0c` is a
red-biased near-black, never neutral grey; surfaces warm as they come forward
(`#1a1011` → `#241618`) rather than lightening. Prose is lit by the lamp
(`--ink-2: #a8968f`, `--ink-3: #8f7a74`) and therefore red-touched. The figure
`--ink: #e9e7d3` is faintly green-cream, like real luminous paint, and is the
one value in the palette with no red in it.

**Light — the same room with the lights up.** Bleached enamel
(`--bg: #efe9e2`), ink `#191313`, and the safelight gone to printed red
(`--accent: #bd2d1a`).

**The readout window stays dark in both themes** (`--cell: #0c0708` dark,
`#1c1214` light, figure `--cell-ink`). A darkroom timer has a dark bakelite
face whether or not the room lights are on. It is the instrument, not a
preference — and it is what keeps the app recognisable in a light theme
instead of dissolving into a white utility.

`--cell-edge` is a hairline on the top edge only: the light catching the lip of
a moulded recess. It is the sole depth cue in the system.

Every text pair in both themes clears WCAG AA at small text (4.5:1); the
readout, which is the thing the product actually promises you can read from
across a room, sits near 15:1 in both.

## Typography

IBM Plex Sans Condensed for everything measured or labelled; IBM Plex Sans for
everything said.

The condensed face is not a default here, it is the instrument's own voice:
enlarger timers, lab counters and scoreboards all set their figures tall and
narrow so a large number fits a small window. It is also already vendored — a
network font is impossible under this project's CSP, so changing face means
shipping new binaries, and no other face answers the brief better enough to
justify that.

Every running value uses tabular figures (`.tnum`), and most sit in cells that
fix the column outright, so a changing digit never shifts the line.

The ramp has one step below `label`: **caption**, at 0.625rem. It exists for
exactly two jobs, both of which are a label riding along another element
rather than standing on its own — the phone tab title under its key, and the
day-offset marker beside a time in the meeting grid. Nothing else may use it,
and nothing that has to be read across a room ever does.

## Layout

One content column, `max-w-3xl`.

- **Desktop (≥64rem):** a fixed 13rem rail on the left, every destination
  visible at once, grouped under Timers and Clocks, each row carrying its key.
- **Phone:** no top bar at all — the page's own `h1` already names the tool. A
  fixed bar at the bottom where the thumb is: four primary tools plus More,
  56px targets, padded by `env(safe-area-inset-bottom)`.

Exactly one navigation is mounted at a time (see `useMediaQuery`): they are
different components, not one restyled, and mounting both would announce every
destination twice.

The fullscreen display drops all navigation — one figure as large as the
viewport allows.

## Named Rules

**The Safelight Rule.** The lamp tints every surface, line and label. The only
thing it does not touch is the figure. Never introduce a neutral grey: if a
value is not luminous cream, it is warmed.

**Rank Is Inversion.** Whatever is live prints inverted — the safelight floods
the cell and the figure goes dark inside it (`.cell[data-live='true']`). This
is the app's entire hierarchy device, which is why there is no second accent
colour anywhere: the running timer, the current interval phase, the ringing
alarm and the active nav key all say "now" the same way.

**One Label Schema.** Every panel labels the same way, in the same order, at
the same size: name, value, unit. No exceptions.

**One Label Scale.** No label outranks another. Hierarchy comes from the
readout, which is the only element in the interface allowed to shout.

**The No Motion Rule.** Nothing animates. There is no keyframe in the
stylesheet and no element changes position, size or rotation over time. The
one exception is a 150ms colour fade on hover and focus — nothing travels and
no layout redraws, and without it the controls read as unresponsive.

**The Flat Rule.** Luminance comes from tone, never from effects. No gradients,
no glass, no blur, no glow filter, no shadows, no circles.

**Digits Don't Dance.** Every running figure is tabular, and in a cell wherever
the space allows.

## Components

### Readout (signature)

Each character in its own sunken cell — dark recess, luminous figure, a
hairline catching the top edge. `:` and `.` are bare separators in the same
voice. The visible row is `aria-hidden` and paired with one `sr-only` twin
carrying the whole string, so a screen reader hears "1:00", not "one colon
zero zero". Cells are keyed by position, so a changing value rewrites the
figure in place. `live` inverts the whole row.

### Gauge (signature)

Time spent as a row of lit cells — the strip of lamps along an instrument's
edge. Same unit as the readout, shrunk. Unlit cells sit at `--surface-2`, lit
cells take the safelight. Decorative and `aria-hidden`: the readout beside it
already carries the value. Never a bar, never a ring.

### Button

One component, three tones (primary / ghost / danger), two scales. Always
emits `touch-target`, which grows the hit area to 44px on a coarse pointer
without changing how the control looks on a mouse.

## Do's and Don'ts

### Do:

- **Do** warm every neutral. A grey that is not red-touched does not belong to
  this room.
- **Do** mark "now" by inversion, and only by inversion.
- **Do** put every running figure in a cell, or at minimum in `.tnum`.
- **Do** pull every color, font and radius from `src/components/tokens.css`;
  the browser chrome (selection, caret, scrollbar, title bar) takes the same
  tokens.
- **Do** size display readouts by `vmin`/`clamp`, so the figure owns the
  viewport.
- **Do** honor `prefers-color-scheme`. (`prefers-reduced-motion` needs no
  handling: there is no motion to reduce.)
- **Do** give any new control `touch-target`.

### Don't:

- **Don't** add shadows, gradients, glass or glow (The Flat Rule). The only
  depth in the system is one top-edge hairline on a cell.
- **Don't** introduce a second accent colour, or a cool/neutral grey, or a
  pure white.
- **Don't** light the readout window in the light theme. The instrument's face
  is dark in both rooms.
- **Don't** add a progress bar, an arc, a ring or a dial — or any circle at
  all — where a Gauge belongs.
- **Don't** animate. No keyframes, no transitions beyond hover/focus colour.
- **Don't** use a proportional figure in a running readout, or a mono face:
  the condensed grotesque is the voice.
- **Don't** load a font or asset from a network origin — assets are
  self-hosted, and the privacy gate fails the build otherwise.
