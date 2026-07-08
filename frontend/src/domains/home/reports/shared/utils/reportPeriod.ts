import { parsePositiveInt } from '@/shared/utils/urlQuery'
import {
  currentYearMonth,
  monthRangeFromYearMonth,
  type ParsedReportPeriod,
  type ReportPeriodDefaults,
  parseReportPeriod,
} from '@/shared/utils/periodUrl'
import { currentMonthParam, monthLabel, shiftMonth } from '@/shared/utils/monthQuery'

export type ReportPeriodMode = 'year' | 'quarter' | 'month' | 'range'

const VALID_MODES = new Set<ReportPeriodMode>(['year', 'quarter', 'month', 'range'])

export interface ParsedReportPeriodState extends ParsedReportPeriod {
  mode: ReportPeriodMode
  quarter: number
}

export function yearBounds(year: number): { dateFrom: string; dateTo: string } {
  return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }
}

export function quarterBounds(year: number, quarter: number): { dateFrom: string; dateTo: string } {
  const q = Math.min(4, Math.max(1, quarter))
  const startMonth = (q - 1) * 3 + 1
  const endMonth = startMonth + 2
  const endDay = new Date(year, endMonth, 0).getDate()
  const sm = String(startMonth).padStart(2, '0')
  const em = String(endMonth).padStart(2, '0')
  return {
    dateFrom: `${year}-${sm}-01`,
    dateTo: `${year}-${em}-${String(endDay).padStart(2, '0')}`,
  }
}

export function quarterLabel(year: number, quarter: number): string {
  const labels = ['I kwartał', 'II kwartał', 'III kwartał', 'IV kwartał']
  const q = Math.min(4, Math.max(1, quarter))
  return `${labels[q - 1]} ${year}`
}

export function shiftQuarter(year: number, quarter: number, delta: number): { year: number; quarter: number } {
  let q = quarter + delta
  let y = year
  while (q < 1) {
    q += 4
    y -= 1
  }
  while (q > 4) {
    q -= 4
    y += 1
  }
  return { year: y, quarter: q }
}

export function shiftYear(year: number, delta: number): number {
  return year + delta
}

export function monthFromDate(dateIso: string): number {
  return Number(dateIso.slice(5, 7))
}

export function quarterFromMonth(month: number): number {
  return Math.ceil(month / 3)
}

export function parseReportPeriodState(
  searchParams: URLSearchParams,
  defaults: ReportPeriodDefaults = currentYearMonth(),
): ParsedReportPeriodState {
  const modeRaw = searchParams.get('periodMode')
  const dateFromParam = searchParams.get('dateFrom')
  const dateToParam = searchParams.get('dateTo')
  const hasPartialDates = Boolean(dateFromParam || dateToParam)
  const hasRange = modeRaw === 'range' || hasPartialDates
  const mode: ReportPeriodMode =
    modeRaw && VALID_MODES.has(modeRaw as ReportPeriodMode)
      ? (modeRaw as ReportPeriodMode)
      : hasRange
        ? 'range'
        : 'month'

  const base = parseReportPeriod(searchParams, defaults)
  const year = parsePositiveInt(searchParams.get('year')) ?? base.year
  const quarterRaw = parsePositiveInt(searchParams.get('quarter'))
  const quarter =
    quarterRaw && quarterRaw >= 1 && quarterRaw <= 4
      ? quarterRaw
      : quarterFromMonth(base.month)

  let dateFrom = base.dateFrom
  let dateTo = base.dateTo
  let month = base.month
  let monthParam = base.monthParam

  if (mode === 'year') {
    const bounds = yearBounds(year)
    dateFrom = bounds.dateFrom
    dateTo = bounds.dateTo
  } else if (mode === 'quarter') {
    const bounds = quarterBounds(year, quarter)
    dateFrom = bounds.dateFrom
    dateTo = bounds.dateTo
    month = bounds.dateFrom.slice(5, 7) ? Number(bounds.dateFrom.slice(5, 7)) : base.month
  } else if (mode === 'month') {
    const bounds = monthRangeFromYearMonth(base.year, base.month)
    dateFrom = bounds.dateFrom
    dateTo = bounds.dateTo
    monthParam = base.monthParam
  } else {
    dateFrom = dateFromParam ?? ''
    dateTo = dateToParam ?? ''
  }

  return {
    ...base,
    mode,
    year,
    quarter,
    month,
    monthParam,
    dateFrom,
    dateTo,
    isCustomRange: mode === 'range',
  }
}

export function periodNavigatorLabel(state: ParsedReportPeriodState): string {
  switch (state.mode) {
    case 'year':
      return String(state.year)
    case 'quarter':
      return quarterLabel(state.year, state.quarter)
    case 'month':
      return monthLabel(state.monthParam)
    case 'range':
      if (!state.dateFrom && !state.dateTo) return 'Cały zakres'
      if (state.dateFrom && !state.dateTo) return `od ${state.dateFrom}`
      if (!state.dateFrom && state.dateTo) return `do ${state.dateTo}`
      return `${state.dateFrom} — ${state.dateTo}`
    default:
      return monthLabel(state.monthParam)
  }
}

export function serializeReportPeriodState(
  state: Pick<ParsedReportPeriodState, 'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo'>,
  base: URLSearchParams,
  defaults: ReportPeriodDefaults = currentYearMonth(),
): URLSearchParams {
  const params = new URLSearchParams(base)
  params.delete('periodMode')
  params.delete('year')
  params.delete('month')
  params.delete('quarter')
  params.delete('dateFrom')
  params.delete('dateTo')

  params.set('periodMode', state.mode)

  if (state.mode === 'year') {
    if (state.year !== defaults.year) params.set('year', String(state.year))
    else params.set('year', String(state.year))
  } else if (state.mode === 'quarter') {
    params.set('year', String(state.year))
    params.set('quarter', String(state.quarter))
  } else if (state.mode === 'month') {
    if (state.year !== defaults.year) params.set('year', String(state.year))
    if (state.month !== defaults.month) params.set('month', String(state.month))
  } else {
    params.set('periodMode', 'range')
    if (state.dateFrom) params.set('dateFrom', state.dateFrom)
    if (state.dateTo) params.set('dateTo', state.dateTo)
  }

  return params
}

export function defaultPeriodState(): ParsedReportPeriodState {
  const defaults = currentYearMonth()
  const monthParam = currentMonthParam()
  const bounds = monthRangeFromYearMonth(defaults.year, defaults.month)
  return {
    mode: 'month',
    isCustomRange: false,
    year: defaults.year,
    month: defaults.month,
    quarter: quarterFromMonth(defaults.month),
    monthParam,
    dateFrom: bounds.dateFrom,
    dateTo: bounds.dateTo,
  }
}

export function switchPeriodMode(
  current: ParsedReportPeriodState,
  mode: ReportPeriodMode,
): Pick<ParsedReportPeriodState, 'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo' | 'monthParam' | 'isCustomRange'> {
  if (mode === 'year') {
    const bounds = yearBounds(current.year)
    return { ...current, mode, ...bounds, isCustomRange: false }
  }
  if (mode === 'quarter') {
    const bounds = quarterBounds(current.year, current.quarter)
    return { ...current, mode, ...bounds, isCustomRange: false }
  }
  if (mode === 'month') {
    const bounds = monthRangeFromYearMonth(current.year, current.month)
    return {
      ...current,
      mode,
      monthParam: `${current.year}-${String(current.month).padStart(2, '0')}`,
      ...bounds,
      isCustomRange: false,
    }
  }
  return {
    ...current,
    mode: 'range',
    dateFrom: current.dateFrom ?? '',
    dateTo: current.dateTo ?? '',
    isCustomRange: true,
  }
}

export function navigatePeriod(
  state: ParsedReportPeriodState,
  direction: -1 | 1,
): Pick<ParsedReportPeriodState, 'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo' | 'monthParam' | 'isCustomRange'> {
  if (state.mode === 'year') {
    const year = shiftYear(state.year, direction)
    const bounds = yearBounds(year)
    return { ...state, year, ...bounds, isCustomRange: false }
  }
  if (state.mode === 'quarter') {
    const next = shiftQuarter(state.year, state.quarter, direction)
    const bounds = quarterBounds(next.year, next.quarter)
    return {
      ...state,
      year: next.year,
      quarter: next.quarter,
      ...bounds,
      isCustomRange: false,
    }
  }
  if (state.mode === 'month') {
    const monthParam = shiftMonth(state.monthParam, direction)
    const match = /^(\d{4})-(\d{2})$/.exec(monthParam)
    const year = match ? Number(match[1]) : state.year
    const month = match ? Number(match[2]) : state.month
    const bounds = monthRangeFromYearMonth(year, month)
    return {
      ...state,
      year,
      month,
      monthParam,
      quarter: quarterFromMonth(month),
      ...bounds,
      isCustomRange: false,
    }
  }
  return state
}

export function buildReportPeriodApiParams(
  period: Pick<ParsedReportPeriodState, 'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo'>,
): Record<string, string> {
  if (period.mode === 'range') {
    const params: Record<string, string> = { periodMode: 'range' }
    if (period.dateFrom) params.dateFrom = period.dateFrom
    if (period.dateTo) params.dateTo = period.dateTo
    return params
  }

  return {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
  }
}

export function formatReportPeriodDisplay(
  period: Pick<ParsedReportPeriodState, 'mode' | 'dateFrom' | 'dateTo' | 'monthParam' | 'year' | 'quarter'>,
): string {
  if (period.mode === 'range') {
    if (!period.dateFrom && !period.dateTo) return 'Cały zakres'
    if (period.dateFrom && !period.dateTo) return `od ${period.dateFrom}`
    if (!period.dateFrom && period.dateTo) return `do ${period.dateTo}`
    return `${period.dateFrom} — ${period.dateTo}`
  }
  return periodNavigatorLabel(period as ParsedReportPeriodState)
}

export function buildCurrentPeriodState(
  mode: ReportPeriodMode,
): Pick<ParsedReportPeriodState, 'mode' | 'year' | 'month' | 'quarter' | 'monthParam' | 'dateFrom' | 'dateTo' | 'isCustomRange'> {
  const defaults = currentYearMonth()
  const monthParam = currentMonthParam()
  const lastDay = new Date(defaults.year, defaults.month, 0).getDate()
  const monthBounds = {
    dateFrom: `${defaults.year}-${String(defaults.month).padStart(2, '0')}-01`,
    dateTo: `${defaults.year}-${String(defaults.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }

  if (mode === 'year') {
    return {
      mode,
      year: defaults.year,
      month: defaults.month,
      quarter: quarterFromMonth(defaults.month),
      monthParam,
      dateFrom: `${defaults.year}-01-01`,
      dateTo: `${defaults.year}-12-31`,
      isCustomRange: false,
    }
  }
  if (mode === 'quarter') {
    const quarter = quarterFromMonth(defaults.month)
    const bounds = quarterBounds(defaults.year, quarter)
    return {
      mode,
      year: defaults.year,
      month: defaults.month,
      quarter,
      monthParam,
      ...bounds,
      isCustomRange: false,
    }
  }
  if (mode === 'range') {
    return {
      mode,
      year: defaults.year,
      month: defaults.month,
      quarter: quarterFromMonth(defaults.month),
      monthParam,
      dateFrom: monthBounds.dateFrom,
      dateTo: monthBounds.dateTo,
      isCustomRange: true,
    }
  }
  return {
    mode: 'month',
    year: defaults.year,
    month: defaults.month,
    quarter: quarterFromMonth(defaults.month),
    monthParam,
    dateFrom: monthBounds.dateFrom,
    dateTo: monthBounds.dateTo,
    isCustomRange: false,
  }
}
