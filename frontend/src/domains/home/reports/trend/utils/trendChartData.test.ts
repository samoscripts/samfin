import { describe, expect, it } from 'vitest'

import { limitTrendReportSeries, TREND_OTHERS_SERIES_ID } from '@/domains/home/reports/trend/utils/trendChartData'
import type { TrendReportData } from '@/domains/home/reports/trend/types/trend'

const baseData: TrendReportData = {
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
        { id: 's1', name: 'A', income: 0, expenses: 100 },
        { id: 's2', name: 'B', income: 0, expenses: 80 },
        { id: 's3', name: 'C', income: 0, expenses: 60 },
        { id: 's4', name: 'D', income: 0, expenses: 40 },
      ],
    },
    {
      period: '2025-02',
      label: 'Lut',
      totals: { income: 0, expenses: 0 },
      series: [
        { id: 's1', name: 'A', income: 0, expenses: 50 },
        { id: 's2', name: 'B', income: 0, expenses: 30 },
        { id: 's3', name: 'C', income: 0, expenses: 20 },
        { id: 's4', name: 'D', income: 0, expenses: 10 },
      ],
    },
  ],
}

describe('limitTrendReportSeries', () => {
  it('Top 3 zostawia 2 + Pozostałe', () => {
    const { data, othersSeriesIds } = limitTrendReportSeries(baseData, 3, ['EXPENSE'])
    expect(data.points[0].series).toHaveLength(3)
    expect(data.points[0].series[2].id).toBe(TREND_OTHERS_SERIES_ID)
    expect(data.points[0].series[2].expenses).toBe(100)
    expect(othersSeriesIds).toEqual(['s3', 's4'])
  })

  it('bez zmian gdy serii <= topN', () => {
    const { data, othersSeriesIds } = limitTrendReportSeries(baseData, 5, ['EXPENSE'])
    expect(data.points[0].series).toHaveLength(4)
    expect(othersSeriesIds).toEqual([])
  })
})
