import { describe, expect, it } from 'vitest'

import {
  buildDirectionBarSeries,
  buildDirectionChartRows,
  buildTrendHeatmapData,
  directionPointsFromBreakdownGroups,
  heatmapCellValue,
} from '@/shared/components/charts/buildDirectionChartSeries'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import type { BreakdownGroup } from '@/domains/home/reports/shared/types/breakdown'
import type { TrendReportData } from '@/domains/home/reports/trend/types/trend'
import {
  directionChartCellId,
  parseDirectionChartCellId,
} from '@/shared/components/charts/directionChartTypes'

const chartStyle: ChartStyle = 'forest'

describe('directionChartCellId', () => {
  it('łączy id wiersza i kierunek', () => {
    expect(directionChartCellId('food', 'EXPENSE')).toBe('food::EXPENSE')
    expect(parseDirectionChartCellId('food::EXPENSE')).toEqual({
      rowId: 'food',
      direction: 'EXPENSE',
    })
  })
})

describe('buildDirectionChartRows', () => {
  it('filtruje kierunki zgodnie z zaznaczeniem', () => {
    const rows = buildDirectionChartRows(
      [{ id: 'a', label: 'A', expenses: 100, income: 50, colorIndex: 0 }],
      ['EXPENSE'],
    )
    expect(rows[0].expenses).toBe(100)
    expect(rows[0].income).toBe(0)
    expect(rows[0].net).toBe(-100)
  })
})

describe('buildDirectionBarSeries', () => {
  it('generuje serie wydatek i wpływ w poprawnej kolejności', () => {
    const series = buildDirectionBarSeries(['EXPENSE', 'INCOME'], chartStyle, 2, {
      keyPrefix: 'cat1',
      seriesLabel: 'Żywność',
    })
    expect(series).toHaveLength(2)
    expect(series[0].dataKey).toBe('cat1_expenses')
    expect(series[1].dataKey).toBe('cat1_income')
    expect(series[0].direction).toBe('EXPENSE')
    expect(series[1].direction).toBe('INCOME')
  })
})

describe('directionPointsFromBreakdownGroups', () => {
  it('mapuje pola expenses/income i fallback amount', () => {
    const groups: BreakdownGroup[] = [
      { id: 1, name: 'A', amount: 0, share: 0, itemCount: 1, expenses: 10, income: 5 },
      { id: 2, name: 'B', amount: 40, share: 0, itemCount: 1 },
    ]
    const points = directionPointsFromBreakdownGroups(groups)
    expect(points[0].expenses).toBe(10)
    expect(points[0].income).toBe(5)
    expect(points[1].expenses).toBe(40)
    expect(points[1].income).toBe(0)
  })
})

describe('buildTrendHeatmapData', () => {
  const data: TrendReportData = {
    dateFrom: '2025-01-01',
    dateTo: '2025-03-31',
    granularity: 'month',
    seriesBy: 'description',
    points: [
      {
        period: '2025-01',
        label: 'Sty',
        totals: { income: 0, expenses: 0 },
        series: [
          { id: 's1', name: 'Allegro', income: 0, expenses: 100 },
          { id: 's2', name: 'Biedronka', income: 0, expenses: 50 },
        ],
      },
      {
        period: '2025-02',
        label: 'Lut',
        totals: { income: 0, expenses: 0 },
        series: [
          { id: 's1', name: 'Allegro', income: 0, expenses: 200 },
          { id: 's2', name: 'Biedronka', income: 0, expenses: 25 },
        ],
      },
    ],
  }

  it('buduje siatkę seria × okres', () => {
    const heatmap = buildTrendHeatmapData(data, 'EXPENSE')
    expect(heatmap.rows).toHaveLength(2)
    expect(heatmap.columns).toHaveLength(2)
    expect(heatmap.maxValue).toBe(200)
    expect(heatmapCellValue(heatmap.cells, 's1', '2025-02')).toBe(200)
  })
})
