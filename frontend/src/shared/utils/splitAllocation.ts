export const MAX_SPLIT_ITEMS = 2
export const MIN_SPLIT_ITEMS = 1
export const DEFAULT_SPLIT_PERCENT = 50

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function toMinor(amount: number): number {
  return Math.round(amount * 100)
}

export function fromMinor(minor: number): number {
  return roundMoney(minor / 100)
}

/** Allocate signed total across percents; last item gets remainder (grosze-safe). */
export function allocateMinorFromPercents(totalMinor: number, percents: number[]): number[] {
  if (percents.length === 0) return []

  const sign = totalMinor < 0 ? -1 : totalMinor > 0 ? 1 : 1
  const absTotal = Math.abs(totalMinor)
  const amounts: number[] = []
  let assigned = 0

  for (let i = 0; i < percents.length; i++) {
    if (i === percents.length - 1) {
      amounts.push(sign * (absTotal - assigned))
    } else {
      const part = Math.round((absTotal * percents[i]) / 100)
      amounts.push(sign * part)
      assigned += part
    }
  }

  return amounts
}

export function allocateAmountsFromPercents(totalAmount: number, percents: number[]): number[] {
  return allocateMinorFromPercents(toMinor(totalAmount), percents).map(fromMinor)
}

/** Sync pair of integer percents summing to 100. */
export function syncPercentPair(changedIndex: 0 | 1, rawValue: number): [number, number] {
  const clamped = clampPercent(rawValue)
  if (changedIndex === 0) {
    return [clamped, 100 - clamped]
  }
  return [100 - clamped, clamped]
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_PERCENT
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function validatePercents(percents: number[]): string | null {
  for (let i = 0; i < percents.length; i++) {
    const p = percents[i]
    if (!Number.isInteger(p)) {
      return `Pozycja ${i + 1}: procent musi być liczbą całkowitą.`
    }
    if (p < 1 || p > 100) {
      return `Pozycja ${i + 1}: procent musi być z zakresu 1–100.`
    }
  }
  const sum = percents.reduce((a, b) => a + b, 0)
  if (sum !== 100) {
    return 'Suma procentów musi wynosić 100%.'
  }
  return null
}

export function inferPercentsFromAmounts(totalAmount: number, amounts: number[]): number[] {
  const totalMinor = Math.abs(toMinor(totalAmount))
  if (totalMinor === 0 || amounts.length <= 1) {
    return amounts.length === 2 ? [DEFAULT_SPLIT_PERCENT, DEFAULT_SPLIT_PERCENT] : [100]
  }
  return amounts.map((a) => clampPercent(Math.round((Math.abs(toMinor(a)) / totalMinor) * 100)))
}

export function sumItemAmounts(items: { amount: number }[]): number {
  return roundMoney(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))
}
