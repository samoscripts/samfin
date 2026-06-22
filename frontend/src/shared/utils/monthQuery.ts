/** Current calendar month as YYYY-MM. */
export function currentMonthParam(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Expand month=YYYY-MM to inclusive date range. */
export function expandMonthSugar(month: string): { dateFrom: string; dateTo: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) return null
  const year = Number(match[1])
  const mon = Number(match[2])
  if (mon < 1 || mon > 12) return null
  const lastDay = new Date(year, mon, 0).getDate()
  const mm = String(mon).padStart(2, '0')
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function parseMonthParam(value: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return expandMonthSugar(trimmed) ? trimmed : undefined
}

export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
] as const

export function monthLabel(monthParam: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam)
  if (!match) return monthParam
  const year = match[1]
  const mon = Number(match[2])
  if (mon < 1 || mon > 12) return monthParam
  return `${MONTH_NAMES[mon - 1]} ${year}`
}

export function shiftMonth(monthParam: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam)
  if (!match) return currentMonthParam()
  let year = Number(match[1])
  let mon = Number(match[2]) + delta
  while (mon < 1) {
    mon += 12
    year -= 1
  }
  while (mon > 12) {
    mon -= 12
    year += 1
  }
  return `${year}-${String(mon).padStart(2, '0')}`
}
