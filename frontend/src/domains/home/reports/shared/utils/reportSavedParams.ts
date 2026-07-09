import { serializeReportFlowFilters } from '@/domains/home/reports/shared/components/ReportSidebar'

import type { ParsedReportPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'

import { serializeReportPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'

import type { BreakdownDirection, BreakdownDirections, BreakdownGroupBy } from '@/domains/home/reports/shared/types/breakdown'
import { normalizeBreakdownDirections, serializeBreakdownDirections } from '@/domains/home/reports/breakdown/utils/breakdownUrl'

import type { TrendGranularity, TrendQueryState } from '@/domains/home/reports/trend/types/trend'

import { implicitTrendGranularity } from '@/domains/home/reports/trend/utils/trendGranularity'

import { serializeTrendQueryState } from '@/domains/home/reports/trend/utils/trendUrl'

import { isFilterValueActive, type FlowFilters } from '@/domains/home/transactions/types'

import type { ReportPeriodDefaults } from '@/shared/utils/periodUrl'

import { currentYearMonth } from '@/shared/utils/periodUrl'



export const REPORT_SAVED_ID_PARAM = 'reportSavedId'



export interface SavedPeriodSnapshot {

  mode: ParsedReportPeriodState['mode']

  year: number

  month: number

  quarter: number

  dateFrom?: string

  dateTo?: string

}



export interface BreakdownSavedParams {

  period: SavedPeriodSnapshot

  groupBy: BreakdownGroupBy

  reportDirections: BreakdownDirections

  chartTop: number

  filters: FlowFilters

}



export interface TrendSavedParams {

  period: SavedPeriodSnapshot

  query: TrendQueryState

  chartType: 'line' | 'bar'

  granularity: TrendGranularity

}



function normalizeFlowFilters(filters: FlowFilters): FlowFilters {

  const out: FlowFilters = {}

  for (const [key, value] of Object.entries(filters)) {

    if (isFilterValueActive(value as FlowFilters[keyof FlowFilters])) {

      ;(out as Record<string, unknown>)[key] = value

    }

  }

  return out

}



function normalizePeriodSnapshot(raw: SavedPeriodSnapshot | Record<string, unknown>): SavedPeriodSnapshot {

  const p = raw as SavedPeriodSnapshot

  const snapshot: SavedPeriodSnapshot = {

    mode: p.mode,

    year: p.year,

    month: p.month,

    quarter: p.quarter,

  }

  if (p.mode === 'range') {

    if (p.dateFrom) snapshot.dateFrom = p.dateFrom

    if (p.dateTo) snapshot.dateTo = p.dateTo

  }

  return snapshot

}



export function normalizeBreakdownParams(

  raw: BreakdownSavedParams | Record<string, unknown>,

): BreakdownSavedParams {

  const p = raw as BreakdownSavedParams & { reportDirection?: BreakdownDirection }

  const reportDirections = normalizeBreakdownDirections(
    p.reportDirections ?? p.reportDirection ?? 'EXPENSE',
  )

  return {

    period: normalizePeriodSnapshot(p.period),

    groupBy: p.groupBy ?? 'categoryMain',

    reportDirections,

    chartTop: p.chartTop ?? 5,

    filters: normalizeFlowFilters(p.filters ?? {}),

  }

}



function normalizeTrendQuery(query: TrendQueryState, granularity: TrendGranularity): TrendQueryState {
  const rawDirections = query.directions?.length ? [...query.directions] : ['EXPENSE']
  const directions =
    rawDirections.length === 1 && rawDirections[0] === 'EXPENSE'
      ? (['EXPENSE'] as TrendQueryState['directions'])
      : (rawDirections as TrendQueryState['directions'])

  return {

    seriesBy: query.seriesBy ?? 'none',

    terms: [...(query.terms ?? [])],

    categoryIds: [...(query.categoryIds ?? [])],

    walletIds: [...(query.walletIds ?? [])],

    concernIds: [...(query.concernIds ?? [])],

    directions,

    granularity,

    narrow: normalizeFlowFilters(query.narrow ?? {}),

  }

}



/** Migracja starego formatu (`chart?: 'line'`) do jawnego `chartType` + `granularity`. */

export function normalizeTrendParams(raw: TrendSavedParams | Record<string, unknown>): TrendSavedParams {

  const p = raw as Partial<TrendSavedParams & { chart?: 'line' }>

  const period = normalizePeriodSnapshot(p.period ?? { mode: 'month', year: 2025, month: 1, quarter: 1 })

  const chartType: 'line' | 'bar' =

    p.chartType === 'line' || p.chart === 'line' ? 'line' : 'bar'

  const queryRaw = (p.query ?? {}) as TrendQueryState

  const granularity = (p.granularity ?? queryRaw.granularity ?? implicitTrendGranularity(period.mode)) as TrendGranularity

  const query = normalizeTrendQuery(queryRaw, granularity)

  return { period, chartType, granularity, query }

}



export function capturePeriodSnapshot(period: ParsedReportPeriodState): SavedPeriodSnapshot {

  return normalizePeriodSnapshot({

    mode: period.mode,

    year: period.year,

    month: period.month,

    quarter: period.quarter,

    dateFrom: period.mode === 'range' && period.dateFrom ? period.dateFrom : undefined,

    dateTo: period.mode === 'range' && period.dateTo ? period.dateTo : undefined,

  })

}



export function periodFromSnapshot(snapshot: SavedPeriodSnapshot): Pick<

  ParsedReportPeriodState,

  'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo' | 'monthParam' | 'isCustomRange'

> {

  const normalized = normalizePeriodSnapshot(snapshot)

  const monthParam = `${normalized.year}-${String(normalized.month).padStart(2, '0')}`

  return {

    mode: normalized.mode,

    year: normalized.year,

    month: normalized.month,

    quarter: normalized.quarter,

    monthParam,

    dateFrom: normalized.dateFrom ?? '',

    dateTo: normalized.dateTo ?? '',

    isCustomRange: normalized.mode === 'range',

  }

}



export function applyPeriodSnapshot(

  snapshot: SavedPeriodSnapshot,

  base: URLSearchParams,

  defaults: ReportPeriodDefaults = currentYearMonth(),

): URLSearchParams {

  return serializeReportPeriodState(periodFromSnapshot(snapshot), base, defaults)

}



export function captureBreakdownParams(

  period: ParsedReportPeriodState,

  groupBy: BreakdownGroupBy,

  reportDirections: BreakdownDirections,

  chartTop: number,

  filters: FlowFilters,

): BreakdownSavedParams {

  return normalizeBreakdownParams({

    period: capturePeriodSnapshot(period),

    groupBy,

    reportDirections,

    chartTop,

    filters: { ...filters },

  })

}



export function applyBreakdownParams(

  params: BreakdownSavedParams | Record<string, unknown>,

  defaults: ReportPeriodDefaults = currentYearMonth(),

  reportSavedId?: number | null,

): URLSearchParams {

  const normalized = normalizeBreakdownParams(params)

  let url = applyPeriodSnapshot(normalized.period, new URLSearchParams(), defaults)

  url = serializeReportFlowFilters(normalized.filters, url)

  url.set('groupBy', normalized.groupBy)

  serializeBreakdownDirections(normalized.reportDirections, url)

  url.set('chartTop', String(normalized.chartTop))

  if (reportSavedId != null) url.set(REPORT_SAVED_ID_PARAM, String(reportSavedId))

  else url.delete(REPORT_SAVED_ID_PARAM)

  return url

}



export function captureTrendParams(

  period: ParsedReportPeriodState,

  query: TrendQueryState,

  chartType: 'line' | 'bar',

): TrendSavedParams {

  const granularity = (query.granularity ?? implicitTrendGranularity(period.mode)) as TrendGranularity

  return normalizeTrendParams({

    period: capturePeriodSnapshot(period),

    chartType,

    granularity,

    query: {

      ...query,

      granularity,

      terms: [...query.terms],

      categoryIds: [...query.categoryIds],

      walletIds: [...query.walletIds],

      concernIds: [...query.concernIds],

      directions: [...query.directions],

      narrow: { ...query.narrow },

    },

  })

}



export function applyTrendParams(

  params: TrendSavedParams | Record<string, unknown>,

  defaults: ReportPeriodDefaults = currentYearMonth(),

  reportSavedId?: number | null,

): URLSearchParams {

  const normalized = normalizeTrendParams(params)

  const query = normalizeTrendQuery(normalized.query, normalized.granularity)

  let url = applyPeriodSnapshot(normalized.period, new URLSearchParams(), defaults)

  url = serializeTrendQueryState(query, url, normalized.period.mode)

  if (normalized.chartType === 'line') url.set('chart', 'line')

  else url.delete('chart')

  if (reportSavedId != null) url.set(REPORT_SAVED_ID_PARAM, String(reportSavedId))

  else url.delete(REPORT_SAVED_ID_PARAM)

  return url

}

