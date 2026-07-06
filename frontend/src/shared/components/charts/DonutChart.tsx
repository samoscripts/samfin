import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import { chartColor, chartThemeColors } from '@/shared/components/charts/chartColors'
import { formatAmount } from '@/shared/utils/format'

export interface DonutChartItem {
  id: string
  name: string
  value: number
}

interface DonutChartProps {
  data: DonutChartItem[]
  onSliceClick?: (id: string) => void
  activeId?: string | null
}

export default function DonutChart({ data, onSliceClick, activeId }: DonutChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Brak danych do wyświetlenia
      </div>
    )
  }

  return (
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
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.id}
              fill={chartColor(index)}
              stroke={activeId === entry.id ? theme.tooltipText : 'transparent'}
              strokeWidth={activeId === entry.id ? 2 : 0}
              opacity={activeId && activeId !== entry.id ? 0.45 : 1}
            />
          ))}
        </Pie>
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
      </PieChart>
    </ResponsiveContainer>
  )
}
