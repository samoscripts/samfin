import type { TrendReportData } from '@/domains/home/reports/trend/types/trend'
import type { BreakdownGroup } from '@/domains/home/reports/shared/types/breakdown'
import { breakdownGroupChartId } from '@/domains/home/reports/shared/utils/chartTopGroups'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import type { ChartDirection, ChartDirectionList, DirectionBarSeriesDef, DirectionChartRow, DirectionValuePoint, HeatmapCellData, HeatmapColumn, HeatmapRow } from '@/shared/components/charts/directionChartTypes'

export function toDirectionChartRow(point: DirectionValuePoint): DirectionChartRow {
  return {
    id: point.id,
    label: point.label,
    expenses: point.expenses,
    income: point.income,
    net: point.income - point.expenses,
    colorIndex: point.colorIndex,
  }
}

export function directionPointsFromBreakdownGroups(groups: BreakdownGroup[]): DirectionValuePoint[] {
  return groups.map((group, index) => {
    let expenses = group.expenses ?? 0
    let income = group.income ?? 0
    if (expenses === 0 && income === 0 && group.amount > 0) {
      expenses = group.amount
    }
    return {
      id: breakdownGroupChartId(group),
      label: group.name,
      expenses,
      income,
      colorIndex: index,
    }
  })
}

export function directionPointsFromTrendSeries(data: TrendReportData): DirectionValuePoint[] {
  if (data.seriesBy === 'none') {
    const totals = data.points.reduce(
      (acc, point) => ({
        expenses: acc.expenses + point.totals.expenses,
        income: acc.income + point.totals.income,
      }),
      { expenses: 0, income: 0 },
    )
    return [
      {
        id: 'total',
        label: 'Razem',
        expenses: totals.expenses,
        income: totals.income,
        colorIndex: 0,
      },
    ]
  }

  const seriesMap = new Map<string, { name: string; expenses: number; income: number }>()
  for (const point of data.points) {
    for (const series of point.series) {
      const existing = seriesMap.get(series.id) ?? { name: series.name, expenses: 0, income: 0 }
      existing.expenses += series.expenses
      existing.income += series.income
      seriesMap.set(series.id, existing)
    }
  }

  return [...seriesMap.entries()].map(([id, series], index) => ({
    id,
    label: series.name,
    expenses: series.expenses,
    income: series.income,
    colorIndex: index,
  }))
}

export function buildDirectionChartRows(
  points: DirectionValuePoint[],
  directions: ChartDirectionList,
): DirectionChartRow[] {
  const showExpense = directions.includes('EXPENSE')
  const showIncome = directions.includes('INCOME')

  return points.map((point) =>
    toDirectionChartRow({
      ...point,
      expenses: showExpense ? point.expenses : 0,
      income: showIncome ? point.income : 0,
    }),
  )
}

export interface BuildDirectionBarSeriesOptions {
  /** Prefiks klucza danych (np. id serii Trendu). */
  keyPrefix?: string
  /** Etykieta serii (np. nazwa kategorii). */
  seriesLabel?: string
  /** Dla stacked — wspólny stackId. */
  stackId?: string
}

export function buildDirectionBarSeries(
  directions: ChartDirectionList,
  _chartStyle: ChartStyle,
  colorIndex: number,
  options: BuildDirectionBarSeriesOptions = {},
): DirectionBarSeriesDef[] {
  const { keyPrefix = '', seriesLabel, stackId } = options
  const prefix = keyPrefix ? `${keyPrefix}_` : ''
  const series: DirectionBarSeriesDef[] = []

  if (directions.includes('EXPENSE')) {
    const name = seriesLabel
      ? `${seriesLabel} — ${DIRECTION_LABEL_BY_VALUE.EXPENSE}`
      : DIRECTION_LABEL_BY_VALUE.EXPENSE
    series.push({
      dataKey: `${prefix}expenses`,
      direction: 'EXPENSE',
      name,
      colorIndex,
      stackId,
    })
  }

  if (directions.includes('INCOME')) {
    const name = seriesLabel
      ? `${seriesLabel} — ${DIRECTION_LABEL_BY_VALUE.INCOME}`
      : DIRECTION_LABEL_BY_VALUE.INCOME
    series.push({
      dataKey: `${prefix}income`,
      direction: 'INCOME',
      name,
      colorIndex,
      stackId,
    })
  }

  return series
}

/** Wiersze Recharts z polami expenses/income (opcjonalnie z prefiksem serii). */
export function directionRowsToRechartsData(
  rows: DirectionChartRow[],
  keyPrefix = '',
): Record<string, string | number>[] {
  const prefix = keyPrefix ? `${keyPrefix}_` : ''
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    [`${prefix}expenses`]: row.expenses,
    [`${prefix}income`]: row.income,
    net: row.net,
    colorIndex: row.colorIndex,
  }))
}

export function buildTrendPeriodChartRows(data: TrendReportData): Record<string, string | number>[] {
  return data.points.map((point) => {
    const row: Record<string, string | number> = {
      id: point.period,
      label: point.label,
      period: point.period,
    }

    if (data.seriesBy === 'none') {
      row.total_expenses = point.totals.expenses
      row.total_income = point.totals.income
    } else {
      for (const series of point.series) {
        row[`${series.id}_expenses`] = series.expenses
        row[`${series.id}_income`] = series.income
      }
    }

    return row
  })
}

export function buildTrendBarSeriesDefs(
  data: TrendReportData,
  directions: ChartDirectionList,
  chartStyle: ChartStyle,
): DirectionBarSeriesDef[] {
  if (data.seriesBy === 'none') {
    return buildDirectionBarSeries(directions, chartStyle, 0, {
      keyPrefix: 'total',
    }).map((def) => ({
      ...def,
      dataKey: def.dataKey,
    }))
  }

  const seriesList = data.points[0]?.series ?? []
  return seriesList.flatMap((series, index) =>
    buildDirectionBarSeries(directions, chartStyle, index, {
      keyPrefix: series.id,
      seriesLabel: series.name,
    }),
  )
}

export interface TrendHeatmapData {
  rows: HeatmapRow[]
  columns: HeatmapColumn[]
  cells: HeatmapCellData[]
  maxValue: number
}

export function buildTrendHeatmapData(
  data: TrendReportData,
  direction: ChartDirection,
): TrendHeatmapData {
  const columns: HeatmapColumn[] = data.points.map((point) => ({
    id: point.period,
    label: point.label,
  }))

  const cells: HeatmapCellData[] = []
  let maxValue = 0

  if (data.seriesBy === 'none') {
    const row: HeatmapRow = { id: 'total', label: 'Razem', colorIndex: 0 }
    for (const point of data.points) {
      const value = direction === 'EXPENSE' ? point.totals.expenses : point.totals.income
      maxValue = Math.max(maxValue, value)
      cells.push({ rowId: row.id, columnId: point.period, value })
    }
    return { rows: [row], columns, cells, maxValue }
  }

  const rows: HeatmapRow[] = (data.points[0]?.series ?? []).map((series, index) => ({
    id: series.id,
    label: series.name,
    colorIndex: index,
  }))

  for (const point of data.points) {
    for (const series of point.series) {
      const value = direction === 'EXPENSE' ? series.expenses : series.income
      maxValue = Math.max(maxValue, value)
      cells.push({ rowId: series.id, columnId: point.period, value })
    }
  }

  return { rows, columns, cells, maxValue }
}

export function heatmapCellValue(
  cells: HeatmapCellData[],
  rowId: string,
  columnId: string,
): number {
  return cells.find((cell) => cell.rowId === rowId && cell.columnId === columnId)?.value ?? 0
}
