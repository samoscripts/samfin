import { describe, expect, it } from 'vitest'

import {
  getBalanceCellPaint,
  getHeatmapCellPaint,
} from '@/shared/components/charts/chartDirectionBarStyle'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'

const chartStyle: ChartStyle = 'forest'

describe('getHeatmapCellPaint', () => {
  it('zwraca minimalną intensywność przy wartości 0', () => {
    const paint = getHeatmapCellPaint(0, 100, 'EXPENSE', chartStyle)
    expect(paint.fillOpacity).toBeCloseTo(0.12, 2)
  })

  it('zwiększa intensywność proporcjonalnie do maxValue', () => {
    const low = getHeatmapCellPaint(25, 100, 'INCOME', chartStyle)
    const high = getHeatmapCellPaint(100, 100, 'INCOME', chartStyle)
    expect(high.fillOpacity).toBeGreaterThan(low.fillOpacity)
    expect(high.fillOpacity).toBeCloseTo(0.95, 2)
  })

  it('przy maxValue 0 używa minimalnej intensywności', () => {
    const paint = getHeatmapCellPaint(50, 0, 'EXPENSE', chartStyle)
    expect(paint.fillOpacity).toBeCloseTo(0.12, 2)
  })
})

describe('getBalanceCellPaint', () => {
  it('dodatni bilans → kolor wpływu', () => {
    const positive = getBalanceCellPaint(120, chartStyle)
    const income = getBalanceCellPaint(1, chartStyle)
    expect(positive.fill).toBe(income.fill)
  })

  it('ujemny bilans → kolor wydatku', () => {
    const negative = getBalanceCellPaint(-80, chartStyle)
    const expense = getBalanceCellPaint(-1, chartStyle)
    expect(negative.fill).toBe(expense.fill)
  })
})
