import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import { getBalanceCellPaint } from '@/shared/components/charts/chartDirectionBarStyle'
import { applyChartStyleSelectionStroke } from '@/shared/components/charts/chartStyleSchemes'
import { chartBarCommonProps, CHART_BAR_RADIUS, CHART_BAR_RADIUS_HORIZONTAL } from '@/shared/components/charts/chartBarShared'
import {
  buildDirectionSelection,
  directionChartEmptyState,
} from '@/shared/components/charts/directionChartShared'
import {
  directionChartCellId,
  type DirectionChartRow,
  type DirectionChartSelection,
} from '@/shared/components/charts/directionChartTypes'

export interface DirectionBalanceBarChartProps {
  rows: DirectionChartRow[]
  chartStyle: ChartStyle
  layout?: 'vertical' | 'horizontal'
  height?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  tickFormatter?: (value: number) => string
}

export default function DirectionBalanceBarChart({
  rows,
  chartStyle,
  layout = 'horizontal',
  height,
  activeSelection,
  onCellClick,
  tickFormatter = (v) => `${v} zł`,
}: DirectionBalanceBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        label: row.label,
        net: row.net,
        colorIndex: row.colorIndex,
      })),
    [rows],
  )

  const activeCellId = activeSelection
    ? directionChartCellId(activeSelection.id, activeSelection.direction)
    : null

  if (chartRows.length === 0) {
    return directionChartEmptyState(layout === 'horizontal' ? 'h-64' : 'h-52')
  }

  const chartHeight =
    height ?? (layout === 'horizontal' ? Math.max(200, chartRows.length * 36 + 24) : 280)

  const balanceDirection = (net: number): 'EXPENSE' | 'INCOME' => (net >= 0 ? 'INCOME' : 'EXPENSE')

  const bar = (
    <Bar
      dataKey="net"
      name="Bilans"
      radius={layout === 'horizontal' ? CHART_BAR_RADIUS_HORIZONTAL : CHART_BAR_RADIUS}
      {...chartBarCommonProps()}
      className={onCellClick ? 'cursor-pointer' : undefined}
      onClick={(entry) => {
        const row = entry as (typeof chartRows)[number]
        const net = Number(row.net ?? 0)
        if (!onCellClick || net === 0) return
        const direction = balanceDirection(net)
        onCellClick(buildDirectionSelection(row.id, row.label, direction, Math.abs(net)))
      }}
      onMouseEnter={(entry) => {
        const row = entry as (typeof chartRows)[number]
        const net = Number(row.net ?? 0)
        setHoverPayload({ label: `${row.label} · Bilans`, value: net })
      }}
      onMouseLeave={() => {
        setHoverPayload(null)
      }}
    >
      {chartRows.map((row) => {
        const direction = balanceDirection(row.net)
        const cellId = directionChartCellId(row.id, direction)
        const base = getBalanceCellPaint(row.net, chartStyle, row.colorIndex)
        const paint = applyChartStyleSelectionStroke(
          { fill: base.fill, fillOpacity: base.fillOpacity, stroke: 'transparent', strokeWidth: 0 },
          cellId,
          activeCellId,
        )
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
        {bar}
      </BarChart>
    ) : (
      <BarChart data={chartRows} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 11 }} />
        <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={tickFormatter} />
        {bar}
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
