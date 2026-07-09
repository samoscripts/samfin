import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import { getTrendBarCellPaint } from '@/shared/components/charts/chartDirectionBarStyle'
import { chartBarCommonProps, CHART_BAR_RADIUS_HORIZONTAL } from '@/shared/components/charts/chartBarShared'
import {
  activeDirectionCellId,
  buildDirectionSelection,
  directionChartEmptyState,
} from '@/shared/components/charts/directionChartShared'
import {
  directionChartCellId,
  type DirectionChartRow,
  type DirectionChartSelection,
} from '@/shared/components/charts/directionChartTypes'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

export interface DirectionDivergingBarChartProps {
  rows: DirectionChartRow[]
  chartStyle: ChartStyle
  /** vertical: oś X = kategorie, wydatek w dół (ujemny); horizontal: oś Y = kategorie, wydatek w lewo */
  layout?: 'vertical' | 'horizontal'
  height?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  tickFormatter?: (value: number) => string
}

export default function DirectionDivergingBarChart({
  rows,
  chartStyle,
  layout = 'horizontal',
  height,
  activeSelection,
  onCellClick,
  tickFormatter = (v) => `${Math.abs(v)} zł`,
}: DirectionDivergingBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        label: row.label,
        expensesNeg: row.expenses > 0 ? -row.expenses : 0,
        incomePos: row.income,
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

  const renderMirrorBar = (
    direction: 'EXPENSE' | 'INCOME',
    dataKey: 'expensesNeg' | 'incomePos',
    amountKey: 'expenses' | 'income',
  ) => (
    <Bar
      key={direction}
      dataKey={dataKey}
      name={DIRECTION_LABEL_BY_VALUE[direction]}
      radius={CHART_BAR_RADIUS_HORIZONTAL}
      {...chartBarCommonProps()}
      className={onCellClick ? 'cursor-pointer' : undefined}
      onClick={(entry) => {
        const row = entry as (typeof chartRows)[number]
        const amount = Number(row[amountKey] ?? 0)
        if (!onCellClick || amount <= 0) return
        onCellClick(buildDirectionSelection(row.id, row.label, direction, amount))
      }}
      onMouseEnter={(entry) => {
        const row = entry as (typeof chartRows)[number]
        const amount = Number(row[amountKey] ?? 0)
        setHoveredCellId(directionChartCellId(row.id, direction))
        setHoverPayload({
          label: `${row.label} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
          value: amount,
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

  const chart =
    layout === 'vertical' ? (
      <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
        <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={tickFormatter} />
        {renderMirrorBar('EXPENSE', 'expensesNeg', 'expenses')}
        {renderMirrorBar('INCOME', 'incomePos', 'income')}
      </BarChart>
    ) : (
      <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <XAxis
          type="number"
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={{ stroke: theme.grid }}
          tickLine={false}
          tickFormatter={tickFormatter}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fill: theme.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        {renderMirrorBar('EXPENSE', 'expensesNeg', 'expenses')}
        {renderMirrorBar('INCOME', 'incomePos', 'income')}
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
