import type { ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import type { TrendGranularity } from '@/domains/home/reports/trend/types/trend'

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  month: 'Miesięczny',
  quarter: 'Kwartalny',
  year: 'Roczny',
}

export function trendGranularityLabel(granularity: TrendGranularity): string {
  return GRANULARITY_LABELS[granularity]
}

export function availableTrendGranularities(
  periodMode: ReportPeriodMode,
): TrendGranularity[] | null {
  switch (periodMode) {
    case 'month':
    case 'quarter':
      return null
    case 'year':
      return ['month', 'quarter']
    case 'range':
      return ['month', 'quarter', 'year']
    default:
      return null
  }
}

export function defaultTrendGranularityForRange(
  dateFrom: string,
  dateTo: string,
): TrendGranularity {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1)
  return days > 400 ? 'year' : 'month'
}

export function implicitTrendGranularity(_periodMode: ReportPeriodMode): TrendGranularity {
  return 'month'
}

export function defaultTrendGranularity(
  periodMode: ReportPeriodMode,
  dateFrom: string,
  dateTo: string,
): TrendGranularity {
  if (periodMode === 'range') return defaultTrendGranularityForRange(dateFrom, dateTo)
  if (periodMode === 'year') return 'month'
  return implicitTrendGranularity(periodMode)
}

export function resolveTrendGranularity(
  periodMode: ReportPeriodMode,
  dateFrom: string,
  dateTo: string,
  urlGranularity: TrendGranularity | undefined,
): TrendGranularity {
  const available = availableTrendGranularities(periodMode)
  if (!available) return implicitTrendGranularity(periodMode)
  if (urlGranularity && available.includes(urlGranularity)) return urlGranularity
  const fallback = defaultTrendGranularity(periodMode, dateFrom, dateTo)
  return available.includes(fallback) ? fallback : available[0]
}

export function shouldPersistTrendGranularityInUrl(periodMode: ReportPeriodMode): boolean {
  return availableTrendGranularities(periodMode) !== null
}
