export interface TrendMonthPoint {
  month: string
  label: string
  income: number
  expenses: number
  balance: number
}

export interface TrendReportData {
  dateFrom: string
  dateTo: string
  points: TrendMonthPoint[]
}

export function getTrendMockData(dateFrom: string, dateTo: string): TrendReportData {
  const points: TrendMonthPoint[] = [
    { month: '2026-01', label: 'Sty', income: 15800, expenses: 11200, balance: 4600 },
    { month: '2026-02', label: 'Lut', income: 16200, expenses: 10850, balance: 5350 },
    { month: '2026-03', label: 'Mar', income: 15900, expenses: 12100, balance: 3800 },
    { month: '2026-04', label: 'Kwi', income: 16100, expenses: 11500, balance: 4600 },
    { month: '2026-05', label: 'Maj', income: 16350, expenses: 13200, balance: 3150 },
    { month: '2026-06', label: 'Cze', income: 16000, expenses: 11800, balance: 4200 },
  ]

  return { dateFrom, dateTo, points }
}
