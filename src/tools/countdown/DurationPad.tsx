const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/**
 * The instrument's keypad.
 *
 * Typing `2m30s` by hand is fine at a desk and hopeless with one thumb and
 * wet hands, which is the scene this product is actually for. Digits shift in
 * from the right, the way every oven and microwave has worked for forty
 * years, and the readout above shows what they mean before anything starts —
 * so the convention never has to be explained.
 *
 * Keys are the same cells as the readout, at thumb size.
 */
export function DurationPad({
  onDigit,
  onBackspace,
  onClear,
  disabled,
}: {
  onDigit: (digit: string) => void
  onBackspace: () => void
  onClear: () => void
  disabled: boolean
}) {
  const keyClass =
    'cell touch-target flex h-14 w-full items-center justify-center text-xl disabled:opacity-40'

  return (
    <fieldset className="grid w-full max-w-xs grid-cols-3 gap-2 border-0 p-0">
      <legend className="sr-only">Duration keypad</legend>
      {KEYS.map((digit) => (
        <button key={digit} type="button" className={keyClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={keyClass}
        onClick={onClear}
        disabled={disabled}
        aria-label="Clear"
        title="Clear"
      >
        C
      </button>
      <button type="button" className={keyClass} onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        className={keyClass}
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Delete last digit"
        title="Delete last digit"
      >
        ⌫
      </button>
    </fieldset>
  )
}
