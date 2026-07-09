import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import { getSeriesDisplayColor } from '@/shared/components/charts/chartDirectionBarStyle'
import {
  buildDirectionSelection,
  directionChartEmptyState,
} from '@/shared/components/charts/directionChartShared'
import {
  type ChartDirectionList,
  type DirectionChartRow,
  type DirectionChartSelection,
} from '@/shared/components/charts/directionChartTypes'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

export interface DirectionAreaChartProps {
  rows: DirectionChartRow[]
  directions: ChartDirectionList
  chartStyle: ChartStyle
  height?: number
  activeSelection?: DirectionChartSelection | null
  onCellClick?: (selection: DirectionChartSelection) => void
  categoryKey?: 'label' | 'id'
  tickFormatter?: (value: number) => string
}

export default function DirectionAreaChart({
  rows,
  directions,
  chartStyle,
  height = 320,
  activeSelection,
  onCellClick,
  categoryKey = 'label',
  tickFormatter = (v) => `${v}`,
}: DirectionAreaChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
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

  if (chartRows.length === 0) {
    return directionChartEmptyState('h-80')
  }

  const expenseColor = getSeriesDisplayColor(chartStyle, 'EXPENSE', 0)
  const incomeColor = getSeriesDisplayColor(chartStyle, 'INCOME', 0)

  const handlePointHover = (
    row: (typeof chartRows)[number],
    direction: 'EXPENSE' | 'INCOME',
    amount: number,
  ) => {
    setHoverPayload({
      label: `${row.label} · ${DIRECTION_LABEL_BY_VALUE[direction]}`,
      value: amount,
    })
  }

  const handlePointClick = (
    row: (typeof chartRows)[number],
    direction: 'EXPENSE' | 'INCOME',
    amount: number,
  ) => {
    if (!onCellClick || amount <= 0) return
    onCellClick(buildDirectionSelection(row.id, row.label, direction, amount))
  }

  const isActive = (rowId: string, direction: 'EXPENSE' | 'INCOME') =>
    activeSelection?.id === rowId && activeSelection.direction === direction

  const renderArea = (direction: 'EXPENSE' | 'INCOME', dataKey: 'expenses' | 'income') => {
    const color = direction === 'EXPENSE' ? expenseColor : incomeColor
    return (
      <Area
        key={direction}
        type="monotone"
        dataKey={dataKey}
        name={DIRECTION_LABEL_BY_VALUE[direction]}
        stroke={color.fill}
        strokeOpacity={color.fillOpacity}
        fill={color.fill}
        fillOpacity={color.fillOpacity * 0.35}
        strokeWidth={2}
        dot={(props: { cx?: number; cy?: number; payload?: (typeof chartRows)[number] }) => {
          const { cx, cy, payload } = props
          if (cx == null || cy == null || !payload) {
            return <circle cx={0} cy={0} r={0} fill="transparent" aria-hidden />
          }
          const amount = Number(payload[dataKey] ?? 0)
          const active = isActive(payload.id, direction)
          return (
            <circle
              cx={cx}
              cy={cy}
              r={active ? 5 : 4}
              fill={active ? theme.tooltipBg : color.fill}
              stroke={color.fill}
              strokeWidth={active ? 2 : 1}
              strokeOpacity={color.fillOpacity}
              onMouseEnter={() => handlePointHover(payload, direction, amount)}
              onMouseLeave={() => setHoverPayload(null)}
              onClick={() => handlePointClick(payload, direction, amount)}
              className={onCellClick && amount > 0 ? 'cursor-pointer' : undefined}
            />
          )
        }}
        activeDot={false}
      />
    )
  }

  return (
    <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na punkt">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={tickFormatter} />
          {showExpense && renderArea('EXPENSE', 'expenses')}
          {showIncome && renderArea('INCOME', 'income')}
        </AreaChart>
      </ResponsiveContainer>
    </ChartHoverPanel>
  )
}
