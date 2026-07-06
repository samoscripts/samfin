import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import { chartColor, chartThemeColors } from '@/shared/components/charts/chartColors'
import { formatAmount } from '@/shared/utils/format'

export interface HorizontalBarChartItem {
  id: string
  name: string
  value: number
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartItem[]
  onBarClick?: (id: string) => void
  activeId?: string | null
  maxItems?: number
}

export default function HorizontalBarChart({
  data,
  onBarClick,
  activeId,
  maxItems = 8,
}: HorizontalBarChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const items = data.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Brak danych do wyświetlenia
      </div>
    )
  }

  const height = Math.max(200, items.length * 36 + 24)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <XAxis
          type="number"
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={{ stroke: theme.grid }}
          tickLine={false}
          tickFormatter={(v) => `${v} zł`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: theme.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: theme.tooltipText }}
          itemStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => formatAmount(value)}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          onClick={(entry) => onBarClick?.(String(entry.id))}
          className={onBarClick ? 'cursor-pointer' : undefined}
        >
          {items.map((entry, index) => (
            <Cell
              key={entry.id}
              fill={chartColor(index)}
              opacity={activeId && activeId !== entry.id ? 0.45 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
