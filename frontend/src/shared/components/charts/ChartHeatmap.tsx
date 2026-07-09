import { useMemo, useState } from 'react'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { getHeatmapCellPaint } from '@/shared/components/charts/chartDirectionBarStyle'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import {
  buildDirectionSelection,
  directionChartEmptyState,
} from '@/shared/components/charts/directionChartShared'
import {
  heatmapCellValue,
} from '@/shared/components/charts/buildDirectionChartSeries'
import type {
  ChartDirection,
  DirectionChartSelection,
  HeatmapCellData,
  HeatmapColumn,
  HeatmapRow,
} from '@/shared/components/charts/directionChartTypes'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import { formatAmount } from '@/shared/utils/format'

export interface ChartHeatmapProps {
  rows: HeatmapRow[]
  columns: HeatmapColumn[]
  cells: HeatmapCellData[]
  direction: ChartDirection
  chartStyle: ChartStyle
  maxValue?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  sectionLabel?: string
}

export default function ChartHeatmap({
  rows,
  columns,
  cells,
  direction,
  chartStyle,
  maxValue: maxValueProp,
  activeSelection,
  onCellClick,
  sectionLabel,
}: ChartHeatmapProps) {
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const maxValue = useMemo(() => {
    if (maxValueProp != null) return maxValueProp
    return cells.reduce((max, cell) => Math.max(max, cell.value), 0)
  }, [cells, maxValueProp])

  if (rows.length === 0 || columns.length === 0) {
    return directionChartEmptyState('h-48')
  }

  const label =
    sectionLabel ?? `Heatmapa · ${DIRECTION_LABEL_BY_VALUE[direction]}`

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na komórkę">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  Seria
                </th>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="px-1.5 py-1.5 font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800/80 max-w-[8rem] truncate"
                  >
                    {row.label}
                  </th>
                  {columns.map((column) => {
                    const value = heatmapCellValue(cells, row.id, column.id)
                    const paint = getHeatmapCellPaint(value, maxValue, direction, chartStyle, row.colorIndex)
                    const isActive =
                      activeSelection?.id === `${row.id}::${column.id}` &&
                      activeSelection.direction === direction

                    return (
                      <td key={column.id} className="p-0.5 border-b border-gray-50 dark:border-gray-800/80">
                        <button
                          type="button"
                          title={`${row.label} · ${column.label}: ${formatAmount(value)}`}
                          className={[
                            'w-full min-w-[2.25rem] h-8 rounded-sm transition-shadow',
                            onCellClick && value > 0 ? 'cursor-pointer hover:ring-2 hover:ring-[#c9a96e]/50' : '',
                            isActive ? 'ring-2 ring-[#163526] dark:ring-[#c9a96e]' : '',
                          ].join(' ')}
                          style={{ backgroundColor: paint.fill, opacity: paint.fillOpacity }}
                          onMouseEnter={() =>
                            setHoverPayload({
                              label: `${row.label} · ${column.label} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
                              value,
                            })
                          }
                          onMouseLeave={() => setHoverPayload(null)}
                          onClick={() => {
                            if (!onCellClick || value <= 0) return
                            onCellClick(
                              buildDirectionSelection(
                                `${row.id}::${column.id}`,
                                `${row.label} · ${column.label}`,
                                direction,
                                value,
                              ),
                            )
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartHoverPanel>
    </div>
  )
}
