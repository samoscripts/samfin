import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import { getTrendBarCellPaint } from '@/shared/components/charts/chartDirectionBarStyle'
import { chartBarCommonProps, CHART_BAR_RADIUS } from '@/shared/components/charts/chartBarShared'
import {
  activeDirectionCellId,
  buildDirectionSelection,
  directionChartEmptyState,
} from '@/shared/components/charts/directionChartShared'
import {
  directionChartCellId,
  type ChartDirectionList,
  type DirectionChartRow,
  type DirectionChartSelection,
} from '@/shared/components/charts/directionChartTypes'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

const STACK_ID = 'direction-stack'

export interface DirectionStackedBarChartProps {
  rows: DirectionChartRow[]
  directions: ChartDirectionList
  chartStyle: ChartStyle
  layout?: 'vertical' | 'horizontal'
  height?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  tickFormatter?: (value: number) => string
}

export default function DirectionStackedBarChart({
  rows,
  directions,
  chartStyle,
  layout: _layout = 'vertical',
  height = 280,
  activeSelection,
  onCellClick,
  tickFormatter = (v) => `${v} zł`,
}: DirectionStackedBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const showExpense = directions.includes('EXPENSE')
  const showIncome = directions.includes('INCOME')

  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        label: row.label,
        expenses: row.expenses,
        income: row.income,
        colorIndex: row.colorIndex,
      })),
    [rows],
  )

  const activeCellId = activeDirectionCellId(activeSelection)

  if (chartRows.length === 0) {
    return directionChartEmptyState()
  }

  const renderStackedBar = (direction: 'EXPENSE' | 'INCOME', dataKey: 'expenses' | 'income') => (
    <Bar
      key={direction}
      dataKey={dataKey}
      name={DIRECTION_LABEL_BY_VALUE[direction]}
      stackId={STACK_ID}
      radius={direction === 'INCOME' && showExpense ? [4, 4, 0, 0] : CHART_BAR_RADIUS}
      {...chartBarCommonProps()}
      className={onCellClick ? 'cursor-pointer' : undefined}
      onClick={(entry) => {
        const row = entry as (typeof chartRows)[number]
        const amount = Number((entry as Record<string, number>)[dataKey] ?? 0)
        if (!onCellClick || amount <= 0) return
        onCellClick(buildDirectionSelection(row.id, row.label, direction, amount))
      }}
      onMouseEnter={(entry) => {
        const row = entry as (typeof chartRows)[number]
        setHoveredCellId(directionChartCellId(row.id, direction))
        setHoverPayload({
          label: `${row.label} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
          value: Number((entry as Record<string, number>)[dataKey] ?? 0),
        })
      }}
      onMouseLeave={() => {
        setHoveredCellId(null)
        setHoverPayload(null)
      }}
    >
      {chartRows.map((row) => {
        const cellId = directionChartCellId(row.id, direction)
        const paint = getTrendBarCellPaint({
          direction,
          colorIndex: row.colorIndex,
          chartStyle,
          cellId,
          activeCellId,
          hoveredCellId,
        })
        return (
          <Cell
            key={cellId}
            fill={paint.fill}
            fillOpacity={paint.fillOpacity}
            stroke={paint.stroke}
            strokeWidth={paint.strokeWidth}
          />
        )
      })}
    </Bar>
  )

  return (
    <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na słupek">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={tickFormatter} />
          {showExpense && renderStackedBar('EXPENSE', 'expenses')}
          {showIncome && renderStackedBar('INCOME', 'income')}
        </BarChart>
      </ResponsiveContainer>
    </ChartHoverPanel>
  )
}
