import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import {
  chartBarCommonProps,
  CHART_BAR_RADIUS,
  renderBarCells,
} from '@/shared/components/charts/chartBarShared'

export interface VerticalBarChartItem {
  id: string
  name: string
  value: number
}

interface VerticalBarChartProps {
  data: VerticalBarChartItem[]
  onBarClick?: (id: string) => void
  activeId?: string | null
  chartStyle: ChartStyle
  direction: 'INCOME' | 'EXPENSE'
}

export default function VerticalBarChart({
  data,
  onBarClick,
  activeId,
  chartStyle,
  direction,
}: VerticalBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)
  const items = data

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-sm text-gray-400">
        Brak danych do wyświetlenia
      </div>
    )
  }

  return (
    <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na słupek">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={items} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={{ stroke: theme.grid }}
            tickLine={false}
            interval={0}
            angle={items.length > 4 ? -28 : 0}
            textAnchor={items.length > 4 ? 'end' : 'middle'}
            height={items.length > 4 ? 56 : 32}
          />
          <YAxis
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) => `${v} zł`}
          />
          <Bar
            dataKey="value"
            radius={CHART_BAR_RADIUS}
            {...chartBarCommonProps()}
            onClick={(entry) => onBarClick?.(String(entry.id))}
            onMouseEnter={(entry, index) => {
              setHoveredIndex(index)
              setHoverPayload({ label: String(entry.name), value: Number(entry.value) })
            }}
            onMouseLeave={() => {
              setHoveredIndex(null)
              setHoverPayload(null)
            }}
            className={onBarClick ? 'cursor-pointer' : undefined}
          >
            {renderBarCells(
              items.map((entry, index) => ({
                cellId: entry.id,
                colorIndex: index,
              })),
              activeId,
              hoveredIndex,
              chartStyle,
              direction,
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartHoverPanel>
  )
}
