import type { TrendChartType, TrendDirection, TrendSeriesBy } from '@/domains/home/reports/trend/types/trend'

const VALID_CHART_TYPES = new Set<TrendChartType>([
  'line',
  'bar',
  'stacked',
  'area',
  'diverging',
  'heatmap',
])

export const TREND_CHART_TYPE_OPTIONS: {
  id: TrendChartType
  label: string
  requiresBothDirections?: boolean
  requiresSeries?: boolean
}[] = [
  { id: 'bar', label: 'Słupkowy' },
  { id: 'line', label: 'Liniowy' },
  { id: 'stacked', label: 'Skumulowany', requiresBothDirections: true },
  { id: 'area', label: 'Obszarowy' },
  { id: 'diverging', label: 'Zwierciadlany', requiresBothDirections: true },
  { id: 'heatmap', label: 'Heatmapa', requiresSeries: true },
]

export function parseTrendChartType(raw: string | null): TrendChartType {
  if (raw && VALID_CHART_TYPES.has(raw as TrendChartType)) {
    return raw as TrendChartType
  }
  return 'bar'
}

export function serializeTrendChartType(
  chartType: TrendChartType,
  params: URLSearchParams,
): URLSearchParams {
  params.delete('chart')
  if (chartType !== 'bar') {
    params.set('chart', chartType)
  }
  return params
}

export function hasBothTrendDirections(directions: TrendDirection[]): boolean {
  return directions.includes('EXPENSE') && directions.includes('INCOME')
}

export function isTrendChartTypeAvailable(
  chartType: TrendChartType,
  directions: TrendDirection[],
  seriesBy: TrendSeriesBy,
): boolean {
  const option = TREND_CHART_TYPE_OPTIONS.find((o) => o.id === chartType)
  if (!option) return false
  if (option.requiresBothDirections && !hasBothTrendDirections(directions)) return false
  if (option.requiresSeries && seriesBy === 'none') return false
  return true
}

/** Auto-fallback stacked/diverging → bar (jeden kierunek), heatmap → bar (brak serii). */
export function resolveTrendChartType(
  chartType: TrendChartType,
  directions: TrendDirection[],
  seriesBy: TrendSeriesBy,
): TrendChartType {
  if (isTrendChartTypeAvailable(chartType, directions, seriesBy)) {
    return chartType
  }
  if (chartType === 'line') return 'line'
  return 'bar'
}

export function trendChartTypeSupportsSelection(chartType: TrendChartType): boolean {
  return chartType !== 'line'
}

export function trendChartTypeLabel(chartType: TrendChartType): string {
  return TREND_CHART_TYPE_OPTIONS.find((o) => o.id === chartType)?.label ?? chartType
}
