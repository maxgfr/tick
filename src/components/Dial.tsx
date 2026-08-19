interface DialProps {
  /** 0 to 1 — the fraction of the ring to fill. */
  progress: number
  /** Pixel size of the square the ring inscribes. */
  size?: number
  /** Stroke width in pixels. */
  stroke?: number
}

/**
 * A progress ring: one circle, one dashoffset. Elapsed fills the ring —
 * time spent is drawn, time left is the gap. Decorative by design: every
 * dial in the app sits next to a text readout that carries the same
 * information for screen readers and search bars alike.
 */
export function Dial({ progress, size = 96, stroke = 6 }: DialProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
