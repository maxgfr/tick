import type { ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'lg'

const STYLES: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-ink)]',
  ghost: 'bg-transparent text-[var(--ink)] border border-[var(--line)]',
  danger: 'bg-transparent text-[var(--ink-3)] border border-transparent',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit'
  title?: string
  /** Overrides the accessible name when the visible content is an icon. */
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * The one button in the app — variant is a tone, size is a scale. Labels set
 * in the condensed face, uppercase, like the board's own controls.
 *
 * `touch-target` is always emitted: it costs nothing on a mouse and lifts the
 * hit area to 44px on a finger, without changing how the control looks.
 */
export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'sm',
  type = 'button',
  title,
  ariaLabel,
  disabled,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`font-display touch-target rounded-xs px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 ${SIZES[size]} ${STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
