import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { getPaletteColor } from '@/shared/components/charts/chartPalettes'

export interface PaletteBarPaint {
  fill: string
  fillOpacity: number
  stroke: string
  strokeWidth: number
}

export function getPaletteBarPaint(
  chartStyle: ChartStyle,
  direction: 'INCOME' | 'EXPENSE',
  colorIndex: number,
  fillOpacity: number,
): PaletteBarPaint {
  return {
    fill: getPaletteColor(chartStyle, direction, colorIndex),
    fillOpacity,
    stroke: 'transparent',
    strokeWidth: 0,
  }
}

/** Delikatna obwódka tylko na zaznaczonym słupku — bez stałych obramowań kierunku. */
export function applyChartStyleSelectionStroke(
  paint: PaletteBarPaint,
  cellId: string,
  activeCellId: string | null | undefined,
): PaletteBarPaint {
  if (activeCellId !== cellId) return paint
  return {
    ...paint,
    stroke: '#163526',
    strokeWidth: 2,
  }
}
