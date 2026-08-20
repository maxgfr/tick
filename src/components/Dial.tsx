interface DialProps {
  /** 0 to 1 — the fraction of the ring to fill. */
  progress: number
  /** Pixel size of the square the ring inscribes. */
  size?: number
  /** Stroke width in pixels. */
  stroke?: number
}

const TICKS = 60
const MAJOR_EVERY = 5

/**
 * The instrument at the center of the app: a stopwatch dial. A ticked bezel —
 * sixty marks, one in five tall — frames a single amber arc. Elapsed time is
 * drawn; time left is the gap. Decorative by design: every dial sits next to
 * a text readout that carries the same information for screen readers.
 */
export function Dial({ progress, size = 96, stroke = 6 }: DialProps) {
  const center = size / 2
  const bezelOuter = center - 1
  const bezelMinor = bezelOuter - Math.max(3, size * 0.02)
  const bezelMajor = bezelOuter - Math.max(6, size * 0.05)
  const radius = center - Math.max(12, size * 0.09)
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {Array.from({ length: TICKS }, (_, i) => {
        const major = i % MAJOR_EVERY === 0
        const angle = (i / TICKS) * 2 * Math.PI - Math.PI / 2
        const inner = major ? bezelMajor : bezelMinor
        return (
          <line
            key={i}
            x1={center + Math.cos(angle) * inner}
            y1={center + Math.sin(angle) * inner}
            x2={center + Math.cos(angle) * bezelOuter}
            y2={center + Math.sin(angle) * bezelOuter}
            stroke={major ? 'var(--ink-3)' : 'var(--line)'}
            strokeWidth={major ? 2 : 1}
          />
        )
      })}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  )
}
