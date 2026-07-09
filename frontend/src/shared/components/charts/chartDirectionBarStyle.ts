import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import {
  applyChartStyleSelectionStroke,
  getPaletteBarPaint,
} from '@/shared/components/charts/chartStyleSchemes'

export const CHART_BAR_BASE_OPACITY = 0.92
export const CHART_BAR_HOVER_LIFT = 1.08

export interface BarCellPaint {
  fill: string
  fillOpacity: number
  stroke: string
  strokeWidth: number
}

export function chartBarHoverOpacity(
  cellId: string,
  _activeCellId: string | null | undefined,
  hoveredCellId: string | null,
  baseOpacity = CHART_BAR_BASE_OPACITY,
): number {
  if (hoveredCellId === cellId) {
    return Math.min(1, baseOpacity * CHART_BAR_HOVER_LIFT)
  }
  return baseOpacity
}

export function chartBarHoverOpacityIndex(
  index: number,
  _entryId: string,
  _activeId: string | null | undefined,
  hoveredIndex: number | null,
  baseOpacity = CHART_BAR_BASE_OPACITY,
): number {
  if (hoveredIndex !== null && hoveredIndex === index) {
    return Math.min(1, baseOpacity * CHART_BAR_HOVER_LIFT)
  }
  return baseOpacity
}

/** Kolor serii jak na wykresie (bez stanu hover / zaznaczenia). */
export function getSeriesDisplayColor(
  chartStyle: ChartStyle,
  direction: 'INCOME' | 'EXPENSE',
  colorIndex: number,
): { fill: string; fillOpacity: number } {
  const paint = getPaletteBarPaint(chartStyle, direction, colorIndex, CHART_BAR_BASE_OPACITY)
  return { fill: paint.fill, fillOpacity: paint.fillOpacity }
}

interface TrendBarPaintParams {
  direction: 'INCOME' | 'EXPENSE'
  colorIndex: number
  chartStyle: ChartStyle
  cellId: string
  activeCellId: string | null | undefined
  hoveredCellId: string | null
}

export function getTrendBarCellPaint(params: TrendBarPaintParams): BarCellPaint {
  const { direction, colorIndex, chartStyle, cellId, activeCellId, hoveredCellId } = params
  const fillOpacity = chartBarHoverOpacity(cellId, activeCellId, hoveredCellId)
  const paint = getPaletteBarPaint(chartStyle, direction, colorIndex, fillOpacity)
  return applyChartStyleSelectionStroke(paint, cellId, activeCellId)
}

interface BreakdownBarPaintParams {
  colorIndex: number
  cellId: string
  activeId: string | null | undefined
  hoveredIndex: number | null
  index: number
  direction: 'INCOME' | 'EXPENSE'
  chartStyle: ChartStyle
}

export function getBreakdownBarCellPaint(params: BreakdownBarPaintParams): BarCellPaint {
  const { colorIndex, cellId, activeId, hoveredIndex, index, direction, chartStyle } = params
  const fillOpacity = chartBarHoverOpacityIndex(index, cellId, activeId, hoveredIndex)
  const paint = getPaletteBarPaint(chartStyle, direction, colorIndex, fillOpacity)
  return applyChartStyleSelectionStroke(paint, cellId, activeId)
}

export function getDonutSlicePaint(
  colorIndex: number,
  direction: 'INCOME' | 'EXPENSE',
  chartStyle: ChartStyle,
  fillOpacity: number,
): BarCellPaint {
  return getPaletteBarPaint(chartStyle, direction, colorIndex, fillOpacity)
}

const HEATMAP_MIN_OPACITY = 0.12
const HEATMAP_MAX_OPACITY = 0.95

/** Intensywność komórki heatmapy na bazie koloru kierunku (nie palety kategorycznej). */
export function getHeatmapCellPaint(
  value: number,
  maxValue: number,
  direction: 'INCOME' | 'EXPENSE',
  chartStyle: ChartStyle,
  colorIndex = 0,
): { fill: string; fillOpacity: number } {
  const base = getSeriesDisplayColor(chartStyle, direction, colorIndex)
  if (maxValue <= 0 || value <= 0) {
    return { fill: base.fill, fillOpacity: HEATMAP_MIN_OPACITY }
  }
  const ratio = Math.min(1, value / maxValue)
  const fillOpacity = HEATMAP_MIN_OPACITY + ratio * (HEATMAP_MAX_OPACITY - HEATMAP_MIN_OPACITY)
  return { fill: base.fill, fillOpacity }
}

/** Kolor słupka bilansu wg znaku netto. */
export function getBalanceCellPaint(
  net: number,
  chartStyle: ChartStyle,
  colorIndex = 0,
): { fill: string; fillOpacity: number } {
  const direction: 'INCOME' | 'EXPENSE' = net >= 0 ? 'INCOME' : 'EXPENSE'
  return getSeriesDisplayColor(chartStyle, direction, colorIndex)
}

/** Zaokrąglenie tylko na zewnętrznej krawędzi pary wydatek|wpływ — wizualnie bliżej siebie. */
export function getPairedBarRadius(
  direction: 'INCOME' | 'EXPENSE',
  bothDirections: boolean,
): [number, number, number, number] {
  if (!bothDirections) return [4, 4, 0, 0]
  if (direction === 'EXPENSE') return [4, 0, 0, 0]
  return [0, 4, 0, 0]
}

/** Ujemny gap — słupki pary stykają się bez szczeliny od zaokrągleń. */
export const CHART_PAIRED_BAR_GAP = -3
