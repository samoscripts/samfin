import type { ReactElement } from 'react'
import { createElement } from 'react'
import { Cell } from 'recharts'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { getBreakdownBarCellPaint } from '@/shared/components/charts/chartDirectionBarStyle'

export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
export const CHART_BAR_RADIUS_HORIZONTAL: [number, number, number, number] = [0, 4, 4, 0]
export const CHART_BAR_MAX_SIZE = 48

export function chartBarCommonProps() {
  return {
    activeBar: false as const,
    maxBarSize: CHART_BAR_MAX_SIZE,
  }
}

export interface BarCellConfig {
  cellId: string
  colorIndex: number
}

export function renderBarCells(
  cells: BarCellConfig[],
  activeCellId: string | null | undefined,
  hoveredIndex: number | null,
  chartStyle: ChartStyle,
  direction: 'INCOME' | 'EXPENSE',
): ReactElement[] {
  return cells.map((cell, index) => {
    const paint = getBreakdownBarCellPaint({
      colorIndex: cell.colorIndex,
      cellId: cell.cellId,
      activeId: activeCellId,
      hoveredIndex,
      index,
      direction,
      chartStyle,
    })

    return createElement(Cell, {
      key: cell.cellId,
      fill: paint.fill,
      fillOpacity: paint.fillOpacity,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
    })
  })
}

export function trendBarCellId(period: string, dataKey: string): string {
  return `${period}::${dataKey}`
}
