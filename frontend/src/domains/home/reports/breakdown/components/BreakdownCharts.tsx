import { useMemo } from 'react'

import DonutChart from '@/shared/components/charts/DonutChart'
import HorizontalBarChart from '@/shared/components/charts/HorizontalBarChart'
import VerticalBarChart from '@/shared/components/charts/VerticalBarChart'
import DirectionGroupedBarChart from '@/shared/components/charts/DirectionGroupedBarChart'
import DirectionStackedBarChart from '@/shared/components/charts/DirectionStackedBarChart'
import DirectionDivergingBarChart from '@/shared/components/charts/DirectionDivergingBarChart'
import DirectionBalanceBarChart from '@/shared/components/charts/DirectionBalanceBarChart'
import {
  buildDirectionChartRows,
  directionPointsFromBreakdownGroups,
} from '@/shared/components/charts/buildDirectionChartSeries'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import { getSeriesDisplayColor } from '@/shared/components/charts/chartDirectionBarStyle'
import type { DirectionChartSelection } from '@/shared/components/charts/directionChartTypes'
import type { FlowFilters } from '@/domains/home/transactions/types'
import type {
  BreakdownChartTab,
  BreakdownDirection,
  BreakdownDirections,
  BreakdownGroup,
  BreakdownGroupBy,
} from '@/domains/home/reports/shared/types/breakdown'
import {
  breakdownGroupChartId,
  limitGroupsForChart,
} from '@/domains/home/reports/shared/utils/chartTopGroups'
import {
  BREAKDOWN_CHART_TAB_LABELS,
  breakdownChartTabShowsLegend,
  visibleBreakdownChartTabs,
} from '@/domains/home/reports/breakdown/utils/breakdownChartType'
import { primaryBreakdownChartDirection } from '@/domains/home/reports/breakdown/utils/breakdownUrl'
import BreakdownGroupTransactions from '@/domains/home/reports/breakdown/components/BreakdownGroupTransactions'
import BreakdownTable from '@/domains/home/reports/breakdown/components/BreakdownTable'

interface BreakdownChartsProps {
  groups: BreakdownGroup[]
  groupBy: BreakdownGroupBy
  chartTop: number
  chartTab: BreakdownChartTab
  onChartTabChange: (tab: BreakdownChartTab) => void
  activeId?: string | null
  activeDirection?: BreakdownDirection | null
  onGroupClick?: (id: string) => void
  onChartSegmentClick?: (id: string, direction: BreakdownDirection) => void
  onRowSelect?: (group: BreakdownGroup) => void
  onDrillDown?: (group: BreakdownGroup) => void
  onClearSelection?: () => void
  directions: BreakdownDirections
  chartStyle: ChartStyle
  dateFrom: string
  dateTo: string
  reportFilters: FlowFilters
  onOpenTransaction?: (txId: number) => void
}

function toSingleDirectionChartItems(groups: BreakdownGroup[]) {
  return groups.map((group) => ({
    id: breakdownGroupChartId(group),
    name: group.name,
    value: group.amount,
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
  chartTab,
  onChartTabChange,
  activeId,
  activeDirection,
  onGroupClick,
  onChartSegmentClick,
  onRowSelect,
  onDrillDown,
  onClearSelection,
  directions,
  chartStyle,
  dateFrom,
  dateTo,
  reportFilters,
  onOpenTransaction,
}: BreakdownChartsProps) {
  const chartDirection: BreakdownDirection = primaryBreakdownChartDirection(directions)
  const isTableTab = chartTab === 'table'
  const showLegend = breakdownChartTabShowsLegend(chartTab)

  const visibleTabs = useMemo(() => visibleBreakdownChartTabs(directions), [directions])

  const { displayGroups, othersSourceGroups } = useMemo(
    () => limitGroupsForChart(groups, chartTop),
    [groups, chartTop],
  )

  const singleDirectionItems = useMemo(
    () => toSingleDirectionChartItems(displayGroups),
    [displayGroups],
  )

  const directionRows = useMemo(() => {
    const points = directionPointsFromBreakdownGroups(displayGroups)
    return buildDirectionChartRows(points, directions)
  }, [displayGroups, directions])

  const directionSelection = useMemo((): DirectionChartSelection | null => {
    if (!activeId || !activeDirection) return null
    const row = directionRows.find((item) => item.id === activeId)
    if (!row) return null
    const amount = activeDirection === 'EXPENSE' ? row.expenses : row.income
    return {
      id: activeId,
      direction: activeDirection,
      amount,
      label: row.label,
    }
  }, [activeId, activeDirection, directionRows])

  const activeGroup = useMemo(() => {
    if (!activeId) return null
    return displayGroups.find((group) => breakdownGroupChartId(group) === activeId) ?? null
  }, [displayGroups, activeId])

  const activeIndex = useMemo(() => {
    if (!activeId) return 0
    const idx = displayGroups.findIndex((group) => breakdownGroupChartId(group) === activeId)
    return idx >= 0 ? idx : 0
  }, [displayGroups, activeId])

  const drillDownDirections = useMemo((): BreakdownDirections | undefined => {
    if (!activeDirection) return undefined
    return [activeDirection]
  }, [activeDirection])

  const handleDirectionCellClick = (selection: DirectionChartSelection) => {
    onChartSegmentClick?.(selection.id, selection.direction)
  }

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
          <nav className="flex gap-0 overflow-x-auto px-2 md:px-4" aria-label="Widok raportu">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onChartTabChange(tab)}
                className={tabButtonClass(chartTab === tab)}
                aria-selected={chartTab === tab}
                role="tab"
              >
                {BREAKDOWN_CHART_TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-4 md:p-5" role="tabpanel">
          {chartTab === 'vertical' && (
            <VerticalBarChart
              data={singleDirectionItems}
              activeId={activeId}
              onBarClick={handleClick}
              chartStyle={chartStyle}
              direction={chartDirection}
            />
          )}
          {chartTab === 'horizontal' && (
            <HorizontalBarChart
              data={singleDirectionItems}
              activeId={activeId}
              onBarClick={handleClick}
              chartStyle={chartStyle}
              direction={chartDirection}
            />
          )}
          {chartTab === 'donut' && (
            <DonutChart
              data={singleDirectionItems}
              activeId={activeId}
              onSliceClick={handleClick}
              chartStyle={chartStyle}
              direction={chartDirection}
            />
          )}
          {chartTab === 'stacked' && (
            <DirectionStackedBarChart
              rows={directionRows}
              directions={directions}
              chartStyle={chartStyle}
              activeSelection={directionSelection}
              onCellClick={handleDirectionCellClick}
            />
          )}
          {chartTab === 'grouped' && (
            <DirectionGroupedBarChart
              rows={directionRows}
              directions={directions}
              chartStyle={chartStyle}
              activeSelection={directionSelection}
              onCellClick={handleDirectionCellClick}
            />
          )}
          {chartTab === 'diverging' && (
            <DirectionDivergingBarChart
              rows={directionRows}
              chartStyle={chartStyle}
              activeSelection={directionSelection}
              onCellClick={handleDirectionCellClick}
            />
          )}
          {chartTab === 'balance' && (
            <DirectionBalanceBarChart
              rows={directionRows}
              chartStyle={chartStyle}
              activeSelection={directionSelection}
              onCellClick={handleDirectionCellClick}
            />
          )}
          {chartTab === 'table' && (
            <BreakdownTable
              groups={displayGroups}
              groupBy={groupBy}
              bothDirections={directions.includes('EXPENSE') && directions.includes('INCOME')}
              activeId={activeId}
              onRowSelect={handleRowSelect}
              onDrillDown={onDrillDown}
              embedded
            />
          )}
        </div>

        {showLegend && (
          <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {singleDirectionItems.map((item, index) => {
              const isActive = activeId === item.id
              const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, chartDirection, index)
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
          groupBy={groupBy}
          directions={directions}
          drillDownDirections={drillDownDirections}
          dateFrom={dateFrom}
          dateTo={dateTo}
          reportFilters={reportFilters}
          onOpenTransaction={onOpenTransaction}
          onClose={() => onClearSelection?.()}
        />
      </div>
    </div>
  )
}
