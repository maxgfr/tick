import type { ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const STYLES: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-ink)]',
  ghost: 'bg-transparent text-[var(--ink)] border border-[var(--line)]',
  danger: 'bg-transparent text-[var(--ink-3)] border border-transparent',
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  type?: 'button' | 'submit'
  title?: string
  /** Overrides the accessible name when the visible content is an icon. */
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/** The one button in the app — variant is a tone, not a component family. */
export function Button({
  children,
  onClick,
  variant = 'ghost',
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
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
