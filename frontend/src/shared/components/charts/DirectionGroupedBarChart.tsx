import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import {
  CHART_PAIRED_BAR_GAP,
  getPairedBarRadius,
  getTrendBarCellPaint,
} from '@/shared/components/charts/chartDirectionBarStyle'
import { chartBarCommonProps } from '@/shared/components/charts/chartBarShared'
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

export interface DirectionGroupedBarChartProps {
  rows: DirectionChartRow[]
  directions: ChartDirectionList
  chartStyle: ChartStyle
  layout?: 'vertical' | 'horizontal'
  height?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  categoryKey?: 'label' | 'id'
  tickFormatter?: (value: number) => string
}

export default function DirectionGroupedBarChart({
  rows,
  directions,
  chartStyle,
  layout = 'vertical',
  height,
  activeSelection,
  onCellClick,
  categoryKey = 'label',
  tickFormatter = (v) => `${v} zł`,
}: DirectionGroupedBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const bothDirections = directions.includes('EXPENSE') && directions.includes('INCOME')
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
    return directionChartEmptyState(layout === 'horizontal' ? 'h-64' : 'h-52')
  }

  const chartHeight =
    height ?? (layout === 'horizontal' ? Math.max(200, chartRows.length * 36 + 24) : 280)

  const handleCellHover = (
    row: (typeof chartRows)[number],
    direction: 'EXPENSE' | 'INCOME',
    amount: number,
  ) => {
    setHoveredCellId(directionChartCellId(row.id, direction))
    setHoverPayload({
      label: `${row.label} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
      value: amount,
    })
  }

  const handleCellClick = (
    row: (typeof chartRows)[number],
    direction: 'EXPENSE' | 'INCOME',
    amount: number,
  ) => {
    if (!onCellClick || amount <= 0) return
    onCellClick(buildDirectionSelection(row.id, row.label, direction, amount))
  }

  const pairedRadius = (direction: 'EXPENSE' | 'INCOME'): [number, number, number, number] => {
    const [a, b, c, d] = getPairedBarRadius(direction, bothDirections)
    if (layout === 'horizontal') return [c, d, a, b]
    return [a, b, c, d]
  }

  const renderBar = (direction: 'EXPENSE' | 'INCOME', dataKey: 'expenses' | 'income') => (
    <Bar
      key={direction}
      dataKey={dataKey}
      name={DIRECTION_LABEL_BY_VALUE[direction]}
      radius={pairedRadius(direction)}
      {...chartBarCommonProps()}
      className={onCellClick ? 'cursor-pointer' : undefined}
      onClick={(entry) =>
        handleCellClick(
          entry as (typeof chartRows)[number],
          direction,
          Number((entry as Record<string, number>)[dataKey] ?? 0),
        )
      }
      onMouseEnter={(entry) =>
        handleCellHover(
          entry as (typeof chartRows)[number],
          direction,
          Number((entry as Record<string, number>)[dataKey] ?? 0),
        )
      }
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

  const chart =
    layout === 'horizontal' ? (
      <BarChart
        data={chartRows}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
        barGap={bothDirections ? CHART_PAIRED_BAR_GAP : 4}
      >
        <XAxis
          type="number"
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={{ stroke: theme.grid }}
          tickLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          type="category"
          dataKey={categoryKey}
          width={120}
          tick={{ fill: theme.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        {showExpense && renderBar('EXPENSE', 'expenses')}
        {showIncome && renderBar('INCOME', 'income')}
      </BarChart>
    ) : (
      <BarChart
        data={chartRows}
        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
        barGap={bothDirections ? CHART_PAIRED_BAR_GAP : 4}
        barCategoryGap={bothDirections ? '18%' : '12%'}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey={categoryKey}
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={{ stroke: theme.grid }}
          tickLine={false}
          interval={0}
          angle={chartRows.length > 4 ? -28 : 0}
          textAnchor={chartRows.length > 4 ? 'end' : 'middle'}
          height={chartRows.length > 4 ? 56 : 32}
        />
        <YAxis
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={tickFormatter}
        />
        {showExpense && renderBar('EXPENSE', 'expenses')}
        {showIncome && renderBar('INCOME', 'income')}
      </BarChart>
    )

  return (
    <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na słupek">
      <ResponsiveContainer width="100%" height={chartHeight}>
        {chart}
      </ResponsiveContainer>
    </ChartHoverPanel>
  )
}
