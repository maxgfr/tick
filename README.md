# tick

A local-first timer suite, entirely in the browser: multiple simultaneous
countdowns with presets, a stopwatch with laps, HIIT/Tabata/EMOM intervals, a
metronome, a world clock, a duration calculator, alarms and a big fullscreen
display. No account, no server, no tracking.

**→ [maxgfr.github.io/tick](https://maxgfr.github.io/tick/)**

## The tools

| Key | Tool            | What it does                                                                                              |
| --- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `1` | **Countdown**   | Multiple timers at once, presets (egg, tea, laundry, meeting…), pause/resume, quick-add                   |
| `2` | **Stopwatch**   | Laps with deltas, tenth precision                                                                         |
| `3` | **Interval**    | HIIT / Tabata / EMOM — prepare, work, rest, rounds, cooldown, timeline preview, distinct phase beeps      |
| `4` | **Metronome**   | 20–300 BPM, 1–12 beat measure, accented downbeat, drift-free lookahead scheduling                         |
| `5` | **World clock** | IANA timezones via `Intl` (zero libraries), day/night indicator, offset from local                        |
| `6` | **Calculator**  | Duration arithmetic: `1:30 + 45m - 20s`                                                                   |
| `7` | **Alarm**       | Time + weekdays, 5-minute snooze, fullscreen ringing overlay, missed alarms flagged                       |
| `8` | **Display**     | Fullscreen across-the-room view — picks its own source: soonest countdown, running interval, or the clock |

Global keys: `?` shortcuts, `M` mute, `F` fullscreen. Every readout uses tabular
figures so digits hold their columns while the value runs.

## Time that doesn't drift

Timers are kept as timestamps, not accumulated ticks: remaining time is derived
from the system clock on every render. Background-tab throttling, a reloaded
page, even a sleeping laptop — the countdown is still right when you look back.
One shared 250 ms ticker drives the UI; audio is scheduled on the Web Audio
clock. State persists in `localStorage` and exports/imports as JSON.

## Privacy

tick is private by architecture, not by policy:

- **No network requests.** The build injects a Content-Security-Policy that
  blocks every outbound origin, and CI re-verifies the built bundle with a
  no-network gate (`pnpm check:network`) — the app cannot phone home because
  the artifact it ships cannot.
- **No accounts, no analytics, no cookies, no tracking** of any kind.
- **Your data stays on your machine** — `localStorage` on your device, moved
  only if you export it yourself.
- **Fonts are self-hosted** (Spline Sans Mono, OFL); no CDN, no font
  telemetry, no third-party anything.

## Offline

Installable as a PWA: after the first load, tick works with the network off.
Notifications are opt-in from an explicit action; wake lock keeps the display
alive; reduced-motion preferences are honored.

## Development

```sh
pnpm install
pnpm verify     # typecheck + lint + test + build + privacy gate
pnpm dev
```

Vite + React 19 + TypeScript (strict) + Tailwind 4 + vite-plugin-pwa, tested
with Vitest (161 tests), linted with oxlint, formatted with Prettier. Time
logic lives in `src/engine/` as pure, fully tested functions — no React, no
DOM.

## License

[MIT](LICENSE) · Spline Sans Mono under [OFL](src/assets/fonts/NOTICE.md).
