/**
 * Duration arithmetic.
 *
 * Left-to-right addition and subtraction over the same duration vocabulary
 * `parseDuration` accepts — "1h 30m + 45m - 20s". No precedence to speak of:
 * timers add and they subtract, and that is the whole grammar.
 */
import { parseDuration } from './duration.ts'

const TERM = /^([+-])\s*(.+)$/

export function evaluateDuration(expression: string): number | null {
  const text = expression.trim()
  if (text === '') return null

  // Split into the first operand and the (sign, operand) pairs that follow.
  // The lookbehind keeps the whitespace with the sign: splitting only right
  // after a non-space means " - " yields two tokens, not three.
  const tokens = text.split(/(?<=\S)(?=\s*[+-])/)
  if (tokens.length === 0) return null

  const first = tokens[0]?.trim() ?? ''
  const firstMs = parseDuration(first)
  if (firstMs === null) return null

  let total = firstMs
  for (const token of tokens.slice(1)) {
    const match = token.trim().match(TERM)
    if (!match) return null
    const value = parseDuration(match[2]!.trim())
    if (value === null) return null
    total += match[1] === '-' ? -value : value
  }

  return total
}
