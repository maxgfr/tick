# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person juggling several timers at once: the cook running an egg, a tea and
the oven at the same time; the athlete pacing HIIT rounds; the musician at a
tempo; the desk worker closing a 25-minute meeting window. The common situation
is "hands busy, across the room, bad light" — the interface is read at a glance
and driven by keyboard as much as by pointer. UI language is English; the
author's household and portfolio are French, so copy stays short enough to
localize by hand if that ever matters.

## Product Purpose

tick is a suite of eight timer tools that runs entirely in the browser:
simultaneous countdowns with presets, a stopwatch with laps, HIIT/Tabata/EMOM
intervals, a metronome, a world clock, a cross-timezone meeting planner, alarms
and a duration calculator — plus a fullscreen across-the-room display, which is
a mode rather than a tool. Success means the second count is right —
timers survive reloads and background-tab throttling without drifting, and time
is kept by deriving remaining time from system-clock timestamps rather than
accumulating ticks.

## Positioning

Zero network by construction, not by promise: the build injects a CSP that
blocks every outbound origin, and CI re-verifies the built bundle with a
no-network gate (`pnpm check:network`). No account, no server, no tracking —
there is nothing to opt out of. In the author's portfolio it complements
`basilico` (Pomodoro) rather than overlapping it.

## Operating Context

Deployed as a project page at https://maxgfr.github.io/tick/ (hash routing,
`/tick/` base). Installable as an offline PWA; after first load it works with
the network off. State lives in `localStorage` (debounced writes, flushed on
pagehide) and moves between devices only if the user exports and imports JSON
from Settings. Audio is Web Audio (unlocked on first gesture), notifications are
opt-in from an explicit action, wake lock and fullscreen are feature-detected.

## Capabilities and Constraints

- Countdown: multiple simultaneous timers, an appliance-style keypad (digits
  shift in from the right, with a live readout of what they mean), the last six
  durations used (each removable), preset chips seeded with the everyday ones
  (egg 6:30/9:30, tea, laundry, meeting…) and prunable, pause/resume/restart.
  Typed entry (`1:30`, `2m30s`) still accepted. There is no save step: starting
  a timer is what records its duration.
- Stopwatch: laps with deltas, requestAnimationFrame tenths.
- Interval: prepare/work/rest/rounds/cooldown configs, Tabata/HIIT/EMOM
  defaults, timeline preview, distinct beeps per phase.
- Metronome: 20–300 BPM, 1–12 beat measure, accented downbeat, lookahead
  scheduling on the Web Audio clock.
- World clock: IANA zones via `Intl` (zero libraries), day/night indicator,
  delta vs local.
- Duration calculator: expressions like `1:30 + 45m - 20s`.
- Alarm: time + weekdays, 5-minute snooze, fullscreen overlay, missed alarms
  flagged.
- Meeting: participants as city + label + working hours, a graded 24-hour grid
  (working / a stretch / outside hours), best windows, one instant converted
  into every local clock with day offsets, and a copyable summary or share
  link. Availability is derived from the absolute instant through `Intl`, so
  daylight saving is correct without a table.
- Display: fullscreen ambient view that picks its own source (soonest
  countdown → running interval → wall clock), wake lock. Reached by `D`; not a
  tool in the navigation, because it only ever presents what is already
  running.
- Global: single 250 ms ticker, live tab title, keyboard shortcuts (1–8 tools,
  `D` display, `,` settings, `?` help, `M` mute, `F` fullscreen), theme
  (system/light/dark), sound + volume, export/import/clear data, and an error
  boundary that can discard corrupted state from inside the app.

Constraints: local-first only — no backend, no accounts, no analytics, no
external requests (enforced by CSP and CI). System-clock math means timers
survive sleep and reload; a user changing the system time intentionally moves
timers with it (documented behavior, not drift).

## Brand Commitments

- Name: **tick** (lowercase), tagline shape "No account, no server, no
  tracking."
- Logo: the instrument's window, two cells wide, mid-count — the left flooded
  by the safelight with its figure gone dark, the right a recess holding one
  luminous figure. Rank is inversion, legible at 16px.
- MIT licensed; self-hosted fonts only (IBM Plex Sans Condensed and IBM Plex
  Sans, OFL).

## Evidence on Hand

The shipped app itself at the URL above; this repository's tests (295) and CI.
No screenshots, testimonials, usage data, or metrics exist — future work must
not fabricate any.

## Product Principles

1. **The clock is the product.** Every feature is judged by whether the second
   count is right when the user looks back at the screen.
2. **Derive, never accumulate.** Remaining time is computed from timestamps at
   read time; throttled background tabs and reloaded pages cannot drift.
3. **Privacy is architecture, not policy.** The app cannot phone home because
   the build and CI make it structurally impossible.
4. **One shared heartbeat.** A single ticker drives every view; audio schedules
   on the audio clock. Two clocks, each used for what it is good at.
5. **Operate, don't configure.** Defaults that work, presets over preferences,
   and a keyboard path for everything.

## Accessibility & Inclusion

Keyboard-first: every tool reachable by single keys, shortcuts listed in an
in-app overlay. There is no animation to opt out of — nothing in the app
moves, so `prefers-reduced-motion` has nothing left to disable. Focus is a 2px
accent outline; color is never the only signal (icons/labels accompany state).
Numerals use tabular figures for readability.
