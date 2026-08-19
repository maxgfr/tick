/**
 * Alarm scheduling.
 *
 * An alarm is a wall-clock time plus the days it may ring — the engine answers
 * the single question the UI needs: what is the next timestamp this alarm
 * fires at, strictly after `now`? Wrapping the week and skipping disabled
 * days is a scan of at most seven candidates, so there is nothing to keep in
 * sync when days change.
 */
export interface AlarmConfig {
  /** "HH:MM", 24-hour. */
  time: string
  /** 0 (Sunday) to 6 (Saturday). Empty means every day. */
  days: number[]
  enabled: boolean
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function nextTrigger(config: AlarmConfig, now: Date): number | null {
  if (!config.enabled) return null

  const match = config.time.match(TIME)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])

  const enabledDays = new Set(config.days)
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hours,
      minutes,
      0,
      0,
    )
    // An alarm at the exact current minute has already rung — the next one is next time.
    if (candidate.getTime() <= now.getTime()) continue
    if (enabledDays.size === 0 || enabledDays.has(candidate.getDay())) {
      return candidate.getTime()
    }
  }
  return null
}
