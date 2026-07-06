import { useMemo, useState } from 'react'
import DonutChart from '@/shared/components/charts/DonutChart'
import HorizontalBarChart from '@/shared/components/charts/HorizontalBarChart'
import VerticalBarChart from '@/shared/components/charts/VerticalBarChart'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { getSeriesDisplayColor } from '@/shared/components/charts/chartDirectionBarStyle'
import type {
  BreakdownDirection,
  BreakdownGroup,
  BreakdownGroupBy,
} from '@/domains/home/reports/shared/types/breakdown'
import {
  breakdownGroupChartId,
  limitGroupsForChart,
} from '@/domains/home/reports/shared/utils/chartTopGroups'
import BreakdownGroupTransactions from '@/domains/home/reports/breakdown/components/BreakdownGroupTransactions'
import BreakdownTable from '@/domains/home/reports/breakdown/components/BreakdownTable'

type ChartTab = 'vertical' | 'horizontal' | 'donut' | 'table'

const CHART_TABS: { id: ChartTab; label: string }[] = [
  { id: 'vertical', label: 'Słupkowy pionowy' },
  { id: 'horizontal', label: 'Słupkowy poziomy' },
  { id: 'donut', label: 'Kołowy' },
  { id: 'table', label: 'Tabela' },
]

interface BreakdownChartsProps {
  groups: BreakdownGroup[]
  groupBy: BreakdownGroupBy
  chartTop: number
  activeId?: string | null
  onGroupClick?: (id: string) => void
  onRowSelect?: (group: BreakdownGroup) => void
  onDrillDown?: (group: BreakdownGroup) => void
  onClearSelection?: () => void
  direction: BreakdownDirection
  chartStyle: ChartStyle
  dateFrom: string
  dateTo: string
}

function toChartItems(groups: BreakdownGroup[]) {
  return groups.map((g) => ({
    id: breakdownGroupChartId(g),
    name: g.name,
    value: g.amount,
  }))
}

function tabButtonClass(isActive: boolean): string {
  return [
    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
    isActive
      ? 'border-[#c9a96e] text-[#c9a96e]'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
  ].join(' ')
}

export default function BreakdownCharts({
  groups,
  groupBy,
  chartTop,
  activeId,
  onGroupClick,
  onRowSelect,
  onDrillDown,
  onClearSelection,
  direction,
  chartStyle,
  dateFrom,
  dateTo,
}: BreakdownChartsProps) {
  const [chartTab, setChartTab] = useState<ChartTab>('vertical')
  const isTableTab = chartTab === 'table'

  const { displayGroups, othersSourceGroups } = useMemo(
    () => limitGroupsForChart(groups, chartTop),
    [groups, chartTop],
  )

  const items = useMemo(() => toChartItems(displayGroups), [displayGroups])

  const activeGroup = useMemo(() => {
    if (!activeId) return null
    return displayGroups.find((g) => breakdownGroupChartId(g) === activeId) ?? null
  }, [displayGroups, activeId])

  const activeIndex = useMemo(() => {
    if (!activeId) return 0
    const idx = displayGroups.findIndex((g) => breakdownGroupChartId(g) === activeId)
    return idx >= 0 ? idx : 0
  }, [displayGroups, activeId])

  const handleClick = (id: string) => {
    onGroupClick?.(id)
  }

  const handleRowSelect = (group: BreakdownGroup) => {
    onRowSelect?.(group)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
      <div className="xl:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col min-h-[320px]">
        <div className="border-b border-gray-200 dark:border-gray-800 shrink-0">
          <nav
            className="flex gap-0 overflow-x-auto px-2 md:px-4"
            aria-label="Widok raportu"
          >
            {CHART_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartTab(tab.id)}
                className={tabButtonClass(chartTab === tab.id)}
                aria-selected={chartTab === tab.id}
                role="tab"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-4 md:p-5" role="tabpanel">
          {chartTab === 'vertical' && (
            <VerticalBarChart
              data={items}
              activeId={activeId}
              onBarClick={handleClick}
              chartStyle={chartStyle}
              direction={direction}
            />
          )}
          {chartTab === 'horizontal' && (
            <HorizontalBarChart
              data={items}
              activeId={activeId}
              onBarClick={handleClick}
              chartStyle={chartStyle}
              direction={direction}
            />
          )}
          {chartTab === 'donut' && (
            <DonutChart
              data={items}
              activeId={activeId}
              onSliceClick={handleClick}
              chartStyle={chartStyle}
              direction={direction}
            />
          )}
          {chartTab === 'table' && (
            <BreakdownTable
              groups={displayGroups}
              groupBy={groupBy}
              activeId={activeId}
              onRowSelect={handleRowSelect}
              onDrillDown={onDrillDown}
              embedded
            />
          )}
        </div>

        {!isTableTab && (
          <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {items.map((item, index) => {
              const isActive = activeId === item.id
              const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, direction, index)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(item.id)}
                    className={[
                      'flex items-center gap-1.5 text-xs transition-colors rounded-md px-1 py-0.5',
                      isActive
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                    ].join(' ')}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5 dark:border-white/10"
                      style={{ backgroundColor: fill, opacity: fillOpacity }}
                    />
                    <span className="truncate max-w-[140px]">{item.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="xl:col-span-2">
        <BreakdownGroupTransactions
          group={activeGroup}
          groupIndex={activeIndex}
          othersSourceGroups={othersSourceGroups}
          direction={direction}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => onClearSelection?.()}
        />
      </div>
    </div>
  )
}
