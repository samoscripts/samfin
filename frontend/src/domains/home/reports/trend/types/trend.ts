import type { FlowFilters } from '@/domains/home/transactions/types'

export type TrendSeriesBy = 'none' | 'description' | 'category' | 'wallet' | 'concern'

export type TrendGranularity = 'month' | 'quarter' | 'year'

export type TrendDirection = 'EXPENSE' | 'INCOME'

export interface TrendSeriesPoint {
  id: string
  name: string
  income: number
  expenses: number
}

export interface TrendPeriodPoint {
  period: string
  label: string
  series: TrendSeriesPoint[]
  totals: { income: number; expenses: number }
}

export interface TrendReportData {
  dateFrom: string | null
  dateTo: string | null
  granularity: TrendGranularity
  seriesBy: TrendSeriesBy
  points: TrendPeriodPoint[]
}

export interface TrendQueryState {
  seriesBy: TrendSeriesBy
  terms: string[]
  categoryIds: string[]
  walletIds: string[]
  concernIds: string[]
  directions: TrendDirection[]
  granularity?: TrendGranularity
  narrow: FlowFilters
}

export interface TrendSeriesDescriptor {
  id: string
  name: string
}

export interface TrendBarSelection {
  period: string
  periodLabel: string
  dataKey: string
  seriesName: string
  direction: TrendDirection
  amount: number
  colorIndex: number
}
