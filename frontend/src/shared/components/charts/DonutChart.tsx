import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { chartBarHoverOpacityIndex } from '@/shared/components/charts/chartDirectionBarStyle'
import { getDonutSlicePaint } from '@/shared/components/charts/chartDirectionBarStyle'
import { applyChartStyleSelectionStroke } from '@/shared/components/charts/chartStyleSchemes'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'

export interface DonutChartItem {
  id: string
  name: string
  value: number
}

interface DonutChartProps {
  data: DonutChartItem[]
  onSliceClick?: (id: string) => void
  activeId?: string | null
  chartStyle: ChartStyle
  direction: 'INCOME' | 'EXPENSE'
}

export default function DonutChart({
  data,
  onSliceClick,
  activeId,
  chartStyle,
  direction,
}: DonutChartProps) {
  const { effective } = useTheme()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Brak danych do wyświetlenia
      </div>
    )
  }

  return (
    <ChartHoverPanel payload={hoverPayload} emptyLabel="Najedź na wykres kołowy">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={100}
            paddingAngle={2}
            onClick={(_, index) => onSliceClick?.(data[index]?.id ?? '')}
            className={onSliceClick ? 'cursor-pointer' : undefined}
            onMouseEnter={(_, index) => {
              const entry = data[index]
              if (!entry) return
              setHoveredIndex(index)
              setHoverPayload({ label: entry.name, value: entry.value })
            }}
            onMouseLeave={() => {
              setHoveredIndex(null)
              setHoverPayload(null)
            }}
          >
            {data.map((entry, index) => {
              const fillOpacity = chartBarHoverOpacityIndex(
                index,
                entry.id,
                activeId,
                hoveredIndex,
              )
              const paint = applyChartStyleSelectionStroke(
                getDonutSlicePaint(index, direction, chartStyle, fillOpacity),
                entry.id,
                activeId,
              )
              const sliceStroke =
                paint.stroke !== 'transparent'
                  ? paint.stroke
                  : effective === 'dark'
                    ? '#111827'
                    : '#ffffff'
              return (
                <Cell
                  key={entry.id}
                  fill={paint.fill}
                  fillOpacity={paint.fillOpacity}
                  stroke={sliceStroke}
                  strokeWidth={paint.strokeWidth > 0 ? paint.strokeWidth : 2}
                />
              )
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartHoverPanel>
  )
}
