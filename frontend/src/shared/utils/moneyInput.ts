import type { Direction } from '@/shared/types'
import { fromMinor, roundMoney, toMinor } from '@/shared/utils/splitAllocation'

/** Apply transaction direction sign to a positive magnitude (PLN). */
export function applySignToAmount(magnitude: number, direction: Direction): number {
  const abs = Math.abs(magnitude)
  return direction === 'EXPENSE' ? -abs : abs
}

/** Flip stored signed amount to match a new direction. */
export function flipSignedAmount(amount: number, direction: Direction): number {
  return applySignToAmount(Math.abs(amount), direction)
}

/** Parse PLN string (comma or dot decimal) to positive float, or null if invalid. */export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const normalized = trimmed.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return null

  return n
}

/** Format PLN amount for text input (Polish decimal comma, no sign). */
export function formatMoneyInput(pln: number): string {
  return Math.abs(pln).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Convert stored minor units to PLN display string for inputs. */
export function minorToMoneyInput(minor: number): string {
  return formatMoneyInput(fromMinor(Math.abs(minor)))
}

/** Parse PLN input string to positive minor units, or null if invalid. */
export function parseMoneyInputToMinor(raw: string): number | null {
  const pln = parseMoneyInput(raw)
  if (pln === null) return null
  return toMinor(pln)
}

/** Parse display input (positive magnitude only) to signed PLN for the given direction. */
export function parseSignedMoneyInput(raw: string, direction: Direction): number | null {
  const magnitude = parseMoneyInput(raw)
  if (magnitude === null) return null
  return roundMoney(applySignToAmount(magnitude, direction))
}

/** Magnitude string for input display (no sign). */
export function toDisplayMagnitude(signedOrMagnitude: number, magnitudeOnly: boolean): string {
  const magnitude = magnitudeOnly ? signedOrMagnitude : Math.abs(signedOrMagnitude)
  return formatMoneyInput(magnitude)
}
