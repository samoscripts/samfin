import type { FlowFilters } from '@/domains/home/transactions/types'
import { flowFiltersToTransactionListHref } from '@/domains/home/transactions/utils/transactionListHref'
import { isFilterValueActive } from '@/domains/home/transactions/types'
import { parseReportFlowFilters } from '@/domains/home/reports/shared/components/ReportSidebar'
import type { ParsedReportPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'
import { quarterBounds, quarterLabel } from '@/domains/home/reports/shared/utils/reportPeriod'
import { monthLabel } from '@/shared/utils/monthQuery'
import type {
  TrendBarSelection,
  TrendDirection,
  TrendGranularity,
  TrendQueryState,
  TrendSeriesBy,
} from '@/domains/home/reports/trend/types/trend'
import {
  resolveTrendGranularity,
  shouldPersistTrendGranularityInUrl,
} from '@/domains/home/reports/trend/utils/trendGranularity'
import { parseCommaList, serializeCommaList } from '@/shared/utils/urlQuery'

const VALID_SERIES_BY = new Set<TrendSeriesBy>([
  'none',
  'description',
  'category',
  'wallet',
  'concern',
])

const VALID_GRANULARITY = new Set<TrendGranularity>(['month', 'quarter', 'year'])

const VALID_DIRECTIONS = new Set<TrendDirection>(['EXPENSE', 'INCOME'])

const NARROW_KEYS: (keyof FlowFilters)[] = [
  'description',
  'categoryId',
  'walletId',
  'concernId',
  'paidFromPartyId',
  'paidToPartyId',
  'amountMin',
  'amountMax',
]

export function parseTrendDirections(raw: string | null): TrendDirection[] {
  const parsed = parseCommaList(raw).filter((d): d is TrendDirection =>
    VALID_DIRECTIONS.has(d as TrendDirection),
  )
  return parsed.length > 0 ? parsed : ['EXPENSE']
}

export function parseTrendSeriesBy(raw: string | null): TrendSeriesBy {
  if (raw && VALID_SERIES_BY.has(raw as TrendSeriesBy)) return raw as TrendSeriesBy
  return 'none'
}

export function parseTrendGranularity(raw: string | null): TrendGranularity | undefined {
  if (raw && VALID_GRANULARITY.has(raw as TrendGranularity)) return raw as TrendGranularity
  return undefined
}

export function parseTrendQueryState(
  searchParams: URLSearchParams,
  period: Pick<ParsedReportPeriodState, 'mode' | 'dateFrom' | 'dateTo'>,
): TrendQueryState {
  const seriesBy = parseTrendSeriesBy(searchParams.get('trendSeriesBy'))
  const flowFilters = parseReportFlowFilters(searchParams)

  const narrow: FlowFilters = {}
  for (const key of NARROW_KEYS) {
    const value = flowFilters[key]
    if (isFilterValueActive(value)) {
      ;(narrow as Record<string, unknown>)[key] = value
    }
  }

  return {
    seriesBy,
    terms: parseCommaList(searchParams.get('trendTerms')),
    categoryIds: parseCommaList(searchParams.get('trendCategoryIds')),
    walletIds: parseCommaList(searchParams.get('trendWalletIds')),
    concernIds: parseCommaList(searchParams.get('trendConcernIds')),
    directions: parseTrendDirections(searchParams.get('trendDirections')),
    granularity: resolveTrendGranularity(
      period.mode,
      period.dateFrom,
      period.dateTo,
      parseTrendGranularity(searchParams.get('trendGranularity')),
    ),
    narrow,
  }
}

const TREND_FILTER_URL_KEYS = [
  'trendSeriesBy',
  'trendTerms',
  'trendCategoryIds',
  'trendWalletIds',
  'trendConcernIds',
  'trendDirections',
  'trendGranularity',
  'description',
  'categoryId',
  'walletId',
  'concernId',
  'amountMin',
  'amountMax',
  'paidFromPartyId',
  'paidToPartyId',
] as const

/** Sygnatura zastosowanych filtrów Trend w URL (bez parametrów okresu). */
export function trendFilterParamsSignature(searchParams: URLSearchParams): string {
  return TREND_FILTER_URL_KEYS.map((key) => `${key}=${searchParams.get(key) ?? ''}`).join('\x1f')
}

export function serializeTrendQueryState(
  state: TrendQueryState,
  base: URLSearchParams,
  periodMode?: ParsedReportPeriodState['mode'],
): URLSearchParams {
  const params = new URLSearchParams(base)

  params.delete('trendSeriesBy')
  params.delete('trendTerms')
  params.delete('trendCategoryIds')
  params.delete('trendWalletIds')
  params.delete('trendConcernIds')
  params.delete('trendDirections')
  params.delete('trendGranularity')

  for (const key of NARROW_KEYS) params.delete(key)

  if (state.seriesBy !== 'none') params.set('trendSeriesBy', state.seriesBy)

  const terms = serializeCommaList(state.terms)
  if (terms) params.set('trendTerms', terms)

  const categoryIds = serializeCommaList(state.categoryIds)
  if (categoryIds) params.set('trendCategoryIds', categoryIds)

  const walletIds = serializeCommaList(state.walletIds)
  if (walletIds) params.set('trendWalletIds', walletIds)

  const concernIds = serializeCommaList(state.concernIds)
  if (concernIds) params.set('trendConcernIds', concernIds)

  const directions = serializeCommaList(state.directions)
  if (directions && !(state.directions.length === 1 && state.directions[0] === 'EXPENSE')) {
    params.set('trendDirections', directions)
  }

  if (
    state.granularity &&
    (periodMode === undefined || shouldPersistTrendGranularityInUrl(periodMode))
  ) {
    params.set('trendGranularity', state.granularity)
  }

  for (const key of NARROW_KEYS) {
    const value = state.narrow[key]
    if (isFilterValueActive(value)) params.set(key, String(value))
  }

  return params
}

/** Etykieta kubełka z pełnym rokiem (do tooltipów i panelu transakcji). */
export function formatTrendPeriodLabel(period: string): string {
  const yearMatch = /^(\d{4})$/.exec(period)
  if (yearMatch) return period

  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(period)
  if (quarterMatch) {
    return quarterLabel(Number(quarterMatch[1]), Number(quarterMatch[2]))
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthMatch) {
    return monthLabel(period)
  }

  return period
}

/** Zakres dat dla identyfikatora kubełka (YYYY-MM | YYYY-Qn | YYYY). */
export function trendPeriodDateBounds(period: string): { dateFrom: string; dateTo: string } {
  const yearMatch = /^(\d{4})$/.exec(period)
  if (yearMatch) {
    const year = Number(yearMatch[1])
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }
  }

  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(period)
  if (quarterMatch) {
    return quarterBounds(Number(quarterMatch[1]), Number(quarterMatch[2]))
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const month = Number(monthMatch[2])
    const lastDay = new Date(year, month, 0).getDate()
    const mm = monthMatch[2]
    return {
      dateFrom: `${year}-${mm}-01`,
      dateTo: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  return { dateFrom: period, dateTo: period }
}

/** Usuwa sufiks kierunku z dataKey wykresu (np. `wal:1_expenses` → `wal:1`). */
export function trendChartDataKeyToSeriesId(dataKey: string): string {
  if (dataKey.endsWith('_expenses')) return dataKey.slice(0, -'_expenses'.length)
  if (dataKey.endsWith('_income')) return dataKey.slice(0, -'_income'.length)
  return dataKey
}

function seriesEntityIdFromChartDataKey(dataKey: string, prefix: string): string | undefined {
  const base = trendChartDataKeyToSeriesId(dataKey)
  if (!base.startsWith(prefix)) return undefined
  const id = base.slice(prefix.length)
  return id.length > 0 ? id : undefined
}

export function trendSelectionToFlowFilters(
  selection: TrendBarSelection,
  query: TrendQueryState,
): FlowFilters {
  const { dateFrom, dateTo } = trendPeriodDateBounds(selection.period)
  const filters: FlowFilters = {
    dateFrom,
    dateTo,
    directions: [selection.direction],
  }

  if (query.seriesBy === 'description' && selection.seriesName !== 'Razem') {
    filters.description = selection.seriesName
  }
  const categoryId = seriesEntityIdFromChartDataKey(selection.dataKey, 'cat:')
  if (query.seriesBy === 'category' && categoryId) {
    filters.categoryId = categoryId
  }
  const walletId = seriesEntityIdFromChartDataKey(selection.dataKey, 'wal:')
  if (query.seriesBy === 'wallet' && walletId) {
    filters.walletId = walletId
  }
  const concernId = seriesEntityIdFromChartDataKey(selection.dataKey, 'con:')
  if (query.seriesBy === 'concern' && concernId) {
    filters.concernId = concernId
  }

  return { ...filters, ...query.narrow }
}

export function trendTransactionsLink(
  selection: TrendBarSelection,
  query: TrendQueryState,
): string {
  return flowFiltersToTransactionListHref(trendSelectionToFlowFilters(selection, query))
}

export function countTrendQueryState(state: TrendQueryState): number {
  let count = 0
  if (state.seriesBy !== 'none') count += 1
  count += state.terms.length
  count += state.categoryIds.length
  count += state.walletIds.length
  count += state.concernIds.length
  const defaultDirs =
    state.directions.length === 1 && state.directions[0] === 'EXPENSE'
  if (!defaultDirs) count += 1
  const narrowKeys: (keyof TrendQueryState['narrow'])[] = [
    'description',
    'categoryId',
    'walletId',
    'concernId',
    'amountMin',
    'amountMax',
    'paidFromPartyId',
    'paidToPartyId',
  ]
  for (const key of narrowKeys) {
    const value = state.narrow[key]
    if (value !== undefined && value !== '') count += 1
  }
  return count
}
