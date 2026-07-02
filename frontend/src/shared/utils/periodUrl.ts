import { buildSearchParams, parsePositiveInt } from '@/shared/utils/urlQuery'
import {
  currentMonthParam,
  expandMonthSugar,
  monthLabel,
} from '@/shared/utils/monthQuery'

export interface ReportPeriodDefaults {
  year: number
  month: number
}

export interface ParsedReportPeriod {
  isCustomRange: boolean
  year: number
  month: number
  monthParam: string
  dateFrom: string
  dateTo: string
}

export function currentYearMonth(): ReportPeriodDefaults {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function yearMonthToParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function paramToYearMonth(monthParam: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

export function monthRangeFromYearMonth(year: number, month: number): { dateFrom: string; dateTo: string } {
  return expandMonthSugar(yearMonthToParam(year, month))!
}

export function parseReportPeriod(
  searchParams: URLSearchParams,
  defaults: ReportPeriodDefaults = currentYearMonth(),
): ParsedReportPeriod {
  const dateFromParam = searchParams.get('dateFrom')
  const dateToParam = searchParams.get('dateTo')
  const isCustomRange = Boolean(dateFromParam && dateToParam)

  if (isCustomRange) {
    const dateFrom = dateFromParam!
    const dateTo = dateToParam!
    const fromMonth = dateFrom.slice(0, 7)
    const ym = paramToYearMonth(fromMonth) ?? defaults

    return {
      isCustomRange: true,
      year: ym.year,
      month: ym.month,
      monthParam: yearMonthToParam(ym.year, ym.month),
      dateFrom,
      dateTo,
    }
  }

  const year = parsePositiveInt(searchParams.get('year')) ?? defaults.year
  const monthRaw = parsePositiveInt(searchParams.get('month')) ?? defaults.month
  const month = monthRaw >= 1 && monthRaw <= 12 ? monthRaw : defaults.month
  const range = monthRangeFromYearMonth(year, month)

  return {
    isCustomRange: false,
    year,
    month,
    monthParam: yearMonthToParam(year, month),
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  }
}

export function serializeReportMonthPeriod(
  year: number,
  month: number,
  defaults: ReportPeriodDefaults,
  extra?: Record<string, string | number | undefined | null>,
): URLSearchParams {
  const params = buildSearchParams({
    year: year !== defaults.year ? year : undefined,
    month: month !== defaults.month ? month : undefined,
    ...extra,
  })
  params.delete('dateFrom')
  params.delete('dateTo')
  return params
}

export function serializeReportRangePeriod(
  dateFrom: string,
  dateTo: string,
  extra?: Record<string, string | number | undefined | null>,
): URLSearchParams {
  return buildSearchParams({
    dateFrom,
    dateTo,
    ...extra,
  })
}

const MONTH_SHORT = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
] as const

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateRangeLabel(dateFrom: string, dateTo: string): string {
  const from = parseIsoDate(dateFrom)
  const to = parseIsoDate(dateTo)
  if (!from || !to) return `${dateFrom} – ${dateTo}`

  const dayFrom = from.getDate()
  const dayTo = to.getDate()
  const monthFrom = MONTH_SHORT[from.getMonth()]
  const monthTo = MONTH_SHORT[to.getMonth()]
  const yearFrom = from.getFullYear()
  const yearTo = to.getFullYear()

  if (yearFrom === yearTo && from.getMonth() === to.getMonth()) {
    if (dayFrom === dayTo) {
      return `${dayFrom} ${monthFrom} ${yearFrom}`
    }
    return `${dayFrom} – ${dayTo} ${monthFrom} ${yearFrom}`
  }

  if (yearFrom === yearTo) {
    return `${dayFrom} ${monthFrom} – ${dayTo} ${monthTo} ${yearFrom}`
  }

  return `${dayFrom} ${monthFrom} ${yearFrom} – ${dayTo} ${monthTo} ${yearTo}`
}

export function periodDisplayLabel(period: ParsedReportPeriod): string {
  if (period.isCustomRange) {
    return formatDateRangeLabel(period.dateFrom, period.dateTo)
  }
  return monthLabel(period.monthParam)
}

export function recentYears(count = 6): number[] {
  const current = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => current - i)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function withReportPeriodPanel(
  params: URLSearchParams,
  keepPanel: boolean,
): URLSearchParams {
  if (keepPanel) {
    params.set('panel', 'period')
  }
  return params
}

export function isCurrentMonthParam(monthParam: string): boolean {
  return monthParam === currentMonthParam()
}
