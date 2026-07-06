import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import PeriodNavigator from '@/shared/components/PeriodNavigator'
import PeriodSidebar from '@/shared/components/PeriodSidebar'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import FilterChips from '@/domains/home/transactions/components/FilterChips'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { countActiveFilters } from '@/domains/home/transactions/types'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { formatAmount } from '@/shared/utils/format'
import {
  currentYearMonth,
  parseReportPeriod,
  paramToYearMonth,
  serializeReportMonthPeriod,
  serializeReportRangePeriod,
  withReportPeriodPanel,
} from '@/shared/utils/periodUrl'
import MockBanner from '@/domains/home/reports/shared/components/MockBanner'
import ReportStatCard from '@/domains/home/reports/shared/components/ReportStatCard'
import ReportFiltersPanel, {
  parseReportFlowFilters,
  serializeReportFlowFilters,
  useReportFiltersPanel,
} from '@/domains/home/reports/shared/components/ReportFiltersPanel'
import { getBreakdownMockData } from '@/domains/home/reports/shared/fixtures/breakdown.fixture'
import type { BreakdownGroup, BreakdownGroupBy, BreakdownDirection } from '@/domains/home/reports/shared/types/breakdown'
import GroupByToggle from '@/domains/home/reports/breakdown/components/GroupByToggle'
import BreakdownCharts from '@/domains/home/reports/breakdown/components/BreakdownCharts'
import BreakdownTable from '@/domains/home/reports/breakdown/components/BreakdownTable'

const VALID_GROUP_BY = new Set<BreakdownGroupBy>([
  'categoryMain',
  'categorySub',
  'wallet',
  'concern',
])

function parseGroupBy(raw: string | null): BreakdownGroupBy {
  if (raw && VALID_GROUP_BY.has(raw as BreakdownGroupBy)) return raw as BreakdownGroupBy
  return 'categoryMain'
}

function parseDirection(raw: string | null, filters: FlowFilters): BreakdownDirection {
  if (raw === 'INCOME' || raw === 'EXPENSE') return raw
  if (filters.directions?.length === 1) return filters.directions[0]
  return 'EXPENSE'
}

export default function BreakdownReport() {
  const periodTriggerRef = useRef<HTMLButtonElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const { open: filtersOpen, openPanel: openFilters, closePanel: closeFilters } = useReportFiltersPanel()

  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(() => parseReportPeriod(searchParams, defaults), [searchParams, defaults])
  const filters = useMemo(() => parseReportFlowFilters(searchParams), [searchParams])
  const groupBy = parseGroupBy(searchParams.get('groupBy'))
  const direction = parseDirection(searchParams.get('reportDirection'), filters)
  const walletId = filters.walletId ?? searchParams.get('walletId') ?? ''
  const categoryId = filters.categoryId ?? ''
  const periodPanelOpen = searchParams.get('panel') === 'period'

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeChartId, setActiveChartId] = useState<string | null>(null)

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => setWallets([]))
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const data = useMemo(
    () =>
      getBreakdownMockData({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        groupBy,
        direction,
        categoryId: categoryId || undefined,
        walletId: walletId || undefined,
      }),
    [period.dateFrom, period.dateTo, groupBy, direction, categoryId, walletId],
  )

  const filterCount = countActiveFilters(filters)

  const walletExtra = useMemo(
    () => ({ walletId: walletId || undefined }),
    [walletId],
  )

  const patchParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined || value === '') params.delete(key)
          else params.set(key, value)
        }
        return params
      }, { replace: true })
    },
    [setSearchParams],
  )

  const handleMonthChange = useCallback(
    (monthParam: string) => {
      const ym = paramToYearMonth(monthParam)
      if (!ym) return
      const params = serializeReportMonthPeriod(ym.year, ym.month, defaults, {
        walletId: walletId || undefined,
      })
      for (const [key, value] of searchParams.entries()) {
        if (!['year', 'month', 'dateFrom', 'dateTo', 'walletId'].includes(key)) {
          params.set(key, value)
        }
      }
      setSearchParams(params, { replace: true })
    },
    [defaults, setSearchParams, searchParams, walletId],
  )

  const openPeriodPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('panel', 'period')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const closePeriodPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('panel')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const handleApplyMonthPick = useCallback(
    (year: number, month: number) => {
      const params = withReportPeriodPanel(
        serializeReportMonthPeriod(year, month, defaults, walletExtra),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [defaults, setSearchParams, walletExtra, periodPanelOpen],
  )

  const handleRangeChange = useCallback(
    (dateFrom: string, dateTo: string) => {
      const params = withReportPeriodPanel(
        serializeReportRangePeriod(dateFrom, dateTo, walletExtra),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [setSearchParams, walletExtra, periodPanelOpen],
  )

  const updateWallet = useCallback(
    (id: string | number | null) => {
      const nextWallet = id == null ? '' : String(id)
      const params = period.isCustomRange
        ? serializeReportRangePeriod(period.dateFrom, period.dateTo, {
            walletId: nextWallet || undefined,
          })
        : serializeReportMonthPeriod(period.year, period.month, defaults, {
            walletId: nextWallet || undefined,
          })
      for (const [k, v] of searchParams.entries()) {
        if (!['year', 'month', 'dateFrom', 'dateTo', 'walletId'].includes(k)) {
          params.set(k, v)
        }
      }
      if (periodPanelOpen) params.set('panel', 'period')
      setSearchParams(params, { replace: true })
    },
    [period, defaults, setSearchParams, periodPanelOpen, searchParams],
  )

  const applyFilters = useCallback(
    (next: FlowFilters) => {
      setSearchParams((prev) => serializeReportFlowFilters(next, new URLSearchParams(prev)), {
        replace: true,
      })
    },
    [setSearchParams],
  )

  const handleGroupByChange = useCallback(
    (value: BreakdownGroupBy) => {
      patchParams({
        groupBy: value,
        categoryId: value === 'categorySub' ? categoryId || null : null,
      })
      setActiveChartId(null)
    },
    [patchParams, categoryId],
  )

  const handleDirectionChange = useCallback(
    (value: BreakdownDirection) => {
      patchParams({ reportDirection: value })
    },
    [patchParams],
  )

  const handleRowClick = useCallback(
    (group: BreakdownGroup) => {
      if (group.id === null) return
      patchParams({
        groupBy: 'categorySub',
        categoryId: String(group.id),
      })
      setActiveChartId(String(group.id))
    },
    [patchParams],
  )

  const handleChartClick = useCallback(
    (id: string) => {
      if (groupBy === 'categoryMain') {
        patchParams({ groupBy: 'categorySub', categoryId: id })
      }
      setActiveChartId(id)
    },
    [groupBy, patchParams],
  )

  const parentCategoryName =
    categoryId && groupBy === 'categorySub'
      ? categories.find((c) => String(c.id) === categoryId)?.name
      : null

  return (
    <>
      <div className="space-y-5">
        <MockBanner />

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <PeriodNavigator
            monthParam={period.monthParam}
            isCustomRange={period.isCustomRange}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            showAdvanced
            advancedOpen={periodPanelOpen}
            onOpenAdvanced={openPeriodPanel}
            advancedButtonRef={periodTriggerRef}
            onMonthChange={handleMonthChange}
          />
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1 min-w-[200px]">
              Portfel
              <DictionarySelect
                items={wallets}
                value={walletId}
                onChange={updateWallet}
                emptyLabel="Wszystkie portfele"
                valueType="string"
              />
            </label>
            <button
              type="button"
              onClick={openFilters}
              className={[
                'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors self-end',
                filterCount > 0
                  ? 'border-[#163526] dark:border-[#c9a96e] text-[#163526] dark:text-[#c9a96e] bg-[#163526]/5 dark:bg-[#c9a96e]/10'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              <SlidersHorizontal size={16} />
              Filtry
              {filterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs bg-[#163526] dark:bg-[#c9a96e] text-white dark:text-[#163526]">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <FilterChips filters={filters} categories={categories} onChange={applyFilters} />

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Okres: {data.dateFrom} — {data.dateTo}
          {parentCategoryName && (
            <> · Podkategorie: <strong className="font-medium">{parentCategoryName}</strong></>
          )}
        </p>

        <GroupByToggle
          groupBy={groupBy}
          direction={direction}
          onGroupByChange={handleGroupByChange}
          onDirectionChange={handleDirectionChange}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportStatCard
            label="Suma"
            value={formatAmount(data.total)}
            valueColor={
              direction === 'INCOME'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
          />
          <ReportStatCard label="Pozycji" value={String(data.itemCount)} />
          <ReportStatCard label="Średnia" value={formatAmount(data.averageAmount)} />
          <ReportStatCard
            label="Bez kategorii"
            value={formatAmount(data.unclassifiedAmount)}
            sub={data.unclassifiedAmount > 0 ? 'Wymaga klasyfikacji' : undefined}
            valueColor={
              data.unclassifiedAmount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : undefined
            }
          />
        </div>

        <BreakdownCharts
          groups={data.groups}
          activeId={activeChartId}
          onGroupClick={handleChartClick}
        />

        <BreakdownTable
          groups={data.groups}
          groupBy={groupBy}
          activeId={activeChartId}
          onRowClick={handleRowClick}
        />
      </div>

      {portalRoot &&
        createPortal(
          <>
            <PeriodSidebar
              open={periodPanelOpen}
              onClose={closePeriodPanel}
              year={period.year}
              month={period.month}
              dateFrom={period.dateFrom}
              dateTo={period.dateTo}
              isCustomRange={period.isCustomRange}
              onApplyMonth={handleApplyMonthPick}
              onApplyRange={handleRangeChange}
              returnFocusRef={periodTriggerRef}
            />
            <ReportFiltersPanel
              open={filtersOpen}
              onClose={closeFilters}
              activeFilters={filters}
              onApply={applyFilters}
            />
          </>,
          portalRoot,
        )}
    </>
  )
}
