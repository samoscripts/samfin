import { createElement, type ReactElement } from 'react'
import { Cell } from 'recharts'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import {
  getBreakdownBarCellPaint,
  getTrendBarCellPaint,
} from '@/shared/components/charts/chartDirectionBarStyle'
import {
  directionChartCellId,
  type ChartDirection,
  type DirectionChartSelection,
} from '@/shared/components/charts/directionChartTypes'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

export const DIRECTION_CHART_EMPTY_LABEL = 'Brak danych do wyświetlenia'

export function directionChartEmptyState(className = 'h-52'): ReactElement {
  return (
    <div
      className={[
        'flex items-center justify-center text-sm text-gray-400',
        className,
      ].join(' ')}
    >
      {DIRECTION_CHART_EMPTY_LABEL}
    </div>
  )
}

export function buildDirectionSelection(
  rowId: string,
  rowLabel: string,
  direction: ChartDirection,
  amount: number,
): DirectionChartSelection {
  return {
    id: rowId,
    direction,
    amount,
    label: `${rowLabel} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
  }
}

interface RenderDirectionCellsParams {
  rowIds: string[]
  colorIndices: number[]
  direction: ChartDirection
  chartStyle: ChartStyle
  activeCellId: string | null | undefined
  hoveredIndex: number | null
  useTrendPaint?: boolean
}

export function renderDirectionBarCells({
  rowIds,
  colorIndices,
  direction,
  chartStyle,
  activeCellId,
  hoveredIndex,
  useTrendPaint = false,
}: RenderDirectionCellsParams): ReactElement[] {
  return rowIds.map((rowId, index) => {
    const cellId = directionChartCellId(rowId, direction)
    const paint = useTrendPaint
      ? getTrendBarCellPaint({
          direction,
          colorIndex: colorIndices[index] ?? index,
          chartStyle,
          cellId,
          activeCellId,
          hoveredCellId: hoveredIndex !== null ? directionChartCellId(rowIds[hoveredIndex] ?? '', direction) : null,
        })
      : getBreakdownBarCellPaint({
          colorIndex: colorIndices[index] ?? index,
          cellId,
          activeId: activeCellId,
          hoveredIndex,
          index,
          direction,
          chartStyle,
        })

    return createElement(Cell, {
      key: cellId,
      fill: paint.fill,
      fillOpacity: paint.fillOpacity,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
    })
  })
}

export function activeDirectionCellId(
  selection: DirectionChartSelection | null | undefined,
): string | null {
  if (!selection) return null
  return directionChartCellId(selection.id, selection.direction)
}
