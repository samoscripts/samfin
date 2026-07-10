import type { TrendDirection, TrendReportData, TrendSeriesPoint } from '@/domains/home/reports/trend/types/trend'
import { itemChartTurnover } from '@/domains/home/reports/shared/utils/chartTopGroups'

export const TREND_OTHERS_SERIES_ID = 'trend:others'

function seriesTurnover(series: TrendSeriesPoint, directions: TrendDirection[]): number {
  let total = 0
  if (directions.includes('EXPENSE')) total += series.expenses
  if (directions.includes('INCOME')) total += series.income
  return total
}

export function countTrendSeries(data: TrendReportData): number {
  if (data.seriesBy === 'none' || data.points.length === 0) return 0
  return data.points[0]?.series.length ?? 0
}

export interface LimitedTrendReportData {
  data: TrendReportData
  othersSeriesIds: string[]
}

export function limitTrendReportSeries(
  data: TrendReportData,
  chartTop: number,
  directions: TrendDirection[],
): LimitedTrendReportData {
  if (data.seriesBy === 'none' || data.points.length === 0) {
    return { data, othersSeriesIds: [] }
  }

  const totals = new Map<string, { id: string; name: string; turnover: number }>()
  for (const point of data.points) {
    for (const series of point.series) {
      if (series.id === TREND_OTHERS_SERIES_ID) continue
      const existing = totals.get(series.id) ?? { id: series.id, name: series.name, turnover: 0 }
      existing.turnover += seriesTurnover(series, directions)
      totals.set(series.id, existing)
    }
  }

  const ranked = [...totals.values()].sort((a, b) => b.turnover - a.turnover)
  if (ranked.length <= chartTop) {
    return { data, othersSeriesIds: [] }
  }

  const headCount = chartTop - 1
  const headIds = new Set(ranked.slice(0, headCount).map((s) => s.id))
  const tailIds = ranked.slice(headCount).map((s) => s.id)
  const tailIdSet = new Set(tailIds)

  const points = data.points.map((point) => {
    const kept = point.series.filter((s) => headIds.has(s.id))
    const tail = point.series.filter((s) => tailIdSet.has(s.id))
    if (tail.length === 0) {
      return { ...point, series: kept }
    }

    const others: TrendSeriesPoint = {
      id: TREND_OTHERS_SERIES_ID,
      name: 'Pozostałe',
      expenses: tail.reduce((sum, s) => sum + s.expenses, 0),
      income: tail.reduce((sum, s) => sum + s.income, 0),
    }

    return { ...point, series: [...kept, others] }
  })

  return {
    data: { ...data, points },
    othersSeriesIds: tailIds,
  }
}

export function aggregateTrendSeriesRank(data: TrendReportData): ChartRankedTrendSeries[] {
  if (data.seriesBy === 'none' || data.points.length === 0) return []

  const map = new Map<string, ChartRankedTrendSeries>()
  for (const point of data.points) {
    for (const series of point.series) {
      const existing = map.get(series.id) ?? {
        id: series.id,
        name: series.name,
        amount: 0,
        expenses: 0,
        income: 0,
      }
      existing.expenses += series.expenses
      existing.income += series.income
      existing.amount = existing.expenses + existing.income
      map.set(series.id, existing)
    }
  }

  return [...map.values()].sort((a, b) => itemChartTurnover(b) - itemChartTurnover(a))
}

export interface ChartRankedTrendSeries {
  id: string
  name: string
  amount: number
  expenses: number
  income: number
}
