import { useMemo } from 'react'
import DonutChart from '@/shared/components/charts/DonutChart'
import HorizontalBarChart from '@/shared/components/charts/HorizontalBarChart'
import { chartColor } from '@/shared/components/charts/chartColors'
import type { BreakdownGroup } from '@/domains/home/reports/shared/types/breakdown'

interface BreakdownChartsProps {
  groups: BreakdownGroup[]
  activeId?: string | null
  onGroupClick?: (id: string) => void
}

function toChartItems(groups: BreakdownGroup[]) {
  return groups.map((g) => ({
    id: g.id === null ? 'null' : String(g.id),
    name: g.name,
    value: g.amount,
  }))
}

export default function BreakdownCharts({ groups, activeId, onGroupClick }: BreakdownChartsProps) {
  const items = useMemo(() => toChartItems(groups), [groups])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-1">
          Udział procentowy
        </h3>
        <DonutChart
          data={items}
          activeId={activeId}
          onSliceClick={(id) => id !== 'null' && onGroupClick?.(id)}
        />
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 mt-2">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: chartColor(index) }}
              />
              <span className="truncate max-w-[140px]">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-1">
          Top pozycje
        </h3>
        <HorizontalBarChart
          data={items}
          activeId={activeId}
          onBarClick={(id) => id !== 'null' && onGroupClick?.(id)}
        />
      </div>
    </div>
  )
}
