import { describe, expect, it } from 'vitest'

import {
  itemChartTurnover,
  limitItemsForChart,
} from '@/domains/home/reports/shared/utils/chartTopGroups'

interface TestItem {
  name: string
  amount: number
  expenses?: number
  income?: number
}

describe('limitItemsForChart', () => {
  it('agreguje Pozostałe z osobnymi polami expenses/income', () => {
    const items: TestItem[] = [
      { name: 'A', amount: 100, expenses: 100, income: 0 },
      { name: 'B', amount: 80, expenses: 80, income: 0 },
      { name: 'C', amount: 60, expenses: 60, income: 0 },
      { name: 'D', amount: 40, expenses: 0, income: 40 },
    ]

    const result = limitItemsForChart(items, 3, (tail) => ({
      name: 'Pozostałe',
      amount: tail.reduce((s, i) => s + i.amount, 0),
      expenses: tail.reduce((s, i) => s + (i.expenses ?? 0), 0),
      income: tail.reduce((s, i) => s + (i.income ?? 0), 0),
    }))

    expect(result.displayItems).toHaveLength(3)
    expect(result.displayItems[2].name).toBe('Pozostałe')
    expect(result.displayItems[2].expenses).toBe(60)
    expect(result.displayItems[2].income).toBe(40)
    expect(result.othersSourceItems).toHaveLength(2)
  })

  it('sortuje po obrocie (expenses + income)', () => {
    const items: TestItem[] = [
      { name: 'low', amount: 10, expenses: 5, income: 5 },
      { name: 'high', amount: 50, expenses: 20, income: 30 },
    ]
    const sorted = [...items].sort((a, b) => itemChartTurnover(b) - itemChartTurnover(a))
    expect(sorted[0].name).toBe('high')
  })
})
