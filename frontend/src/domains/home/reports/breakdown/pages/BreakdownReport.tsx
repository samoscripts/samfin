import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchBreakdownReport } from '@/shared/api/breakdown'
import { formatAmount } from '@/shared/utils/format'
import { currentYearMonth } from '@/shared/utils/periodUrl'
import ReportStatCard from '@/domains/home/reports/shared/components/ReportStatCard'
import ReportPageShell from '@/domains/home/reports/shared/components/ReportPageShell'
import ReportFilterChips from '@/domains/home/reports/shared/components/ReportFilterChips'
import ReportSidebar, {
  countReportFilters,
  parseReportFlowFilters,
  serializeReportFlowFilters,
  useReportSidebar,
} from '@/domains/home/reports/shared/components/ReportSidebar'
import ReportChartTopSection from '@/domains/home/reports/shared/components/ReportChartTopSection'
import { ReportGroupingSection } from '@/domains/home/reports/shared/components/ReportSidebarSections'
import { parseChartTop, breakdownGroupChartId } from '@/domains/home/reports/shared/utils/chartTopGroups'
import { buildCurrentPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'
import {
  navigatePeriod,
  parseReportPeriodState,
  serializeReportPeriodState,
  switchPeriodMode,
  type ReportPeriodMode,
} from '@/domains/home/reports/shared/utils/reportPeriod'
import type {
  BreakdownGroup,
  BreakdownGroupBy,
  BreakdownDirection,
  BreakdownReportData,
} from '@/domains/home/reports/shared/types/breakdown'
import BreakdownCharts from '@/domains/home/reports/breakdown/components/BreakdownCharts'
import { useChartStyle } from '@/shared/hooks/useChartStyle'

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

function parseDirection(raw: string | null): BreakdownDirection {
  if (raw === 'INCOME' || raw === 'EXPENSE') return raw
  return 'EXPENSE'
}

function emptyData(groupBy: BreakdownGroupBy, direction: BreakdownDirection): BreakdownReportData {
  return {
    dateFrom: '',
    dateTo: '',
    groupBy,
    direction,
    total: 0,
    itemCount: 0,
    averageAmount: 0,
    unclassifiedAmount: 0,
    groups: [],
  }
}

export default function BreakdownReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: sidebarOpen, openPanel, closePanel } = useReportSidebar()
  const [chartStyle, setChartStyle] = useChartStyle()

  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(
    () => parseReportPeriodState(searchParams, defaults),
    [searchParams, defaults],
  )
  const filters = useMemo(() => parseReportFlowFilters(searchParams), [searchParams])
  const groupBy = parseGroupBy(searchParams.get('groupBy'))
  const direction = parseDirection(searchParams.get('reportDirection'))
  const walletId = filters.walletId ?? ''
  const categoryId = filters.categoryId ?? ''

  const [categories, setCategories] = useState<Category[]>([])
  const [activeChartId, setActiveChartId] = useState<string | null>(null)
  const [data, setData] = useState<BreakdownReportData>(() => emptyData(groupBy, direction))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchBreakdownReport({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      groupBy,
      reportDirection: direction,
      walletId: filters.walletId,
      categoryId: filters.categoryId,
      concernId: filters.concernId,
      paidFromPartyId: filters.paidFromPartyId,
      paidToPartyId: filters.paidToPartyId,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      description: filters.description,
    })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Nie udało się załadować raportu.')
          setData(emptyData(groupBy, direction))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period.dateFrom, period.dateTo, groupBy, direction, filters])

  const chartTop = useMemo(
    () => parseChartTop(searchParams.get('chartTop'), data.groups.length),
    [searchParams, data.groups.length],
  )

  const filterCount = countReportFilters(filters)

  const applyPeriod = useCallback(
    (
      next: Pick<
        typeof period,
        'mode' | 'year' | 'month' | 'quarter' | 'dateFrom' | 'dateTo' | 'monthParam' | 'isCustomRange'
      >,
    ) => {
      setSearchParams(
        (prev) => serializeReportPeriodState(next, new URLSearchParams(prev), defaults),
        { replace: true },
      )
    },
    [setSearchParams, defaults],
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

  const handlePeriodModeChange = useCallback(
    (mode: ReportPeriodMode) => {
      if (mode === period.mode) return
      applyPeriod(switchPeriodMode(period, mode))
    },
    [period, applyPeriod],
  )

  const handlePeriodNavigate = useCallback(
    (dir: -1 | 1) => {
      applyPeriod(navigatePeriod(period, dir))
    },
    [period, applyPeriod],
  )

  const handlePeriodJumpToCurrent = useCallback(() => {
    applyPeriod(buildCurrentPeriodState(period.mode))
  }, [period.mode, applyPeriod])

  const handlePeriodRangeChange = useCallback(
    (dateFrom: string, dateTo: string) => {
      applyPeriod({
        ...period,
        mode: 'range',
        dateFrom,
        dateTo,
        isCustomRange: true,
      })
    },
    [period, applyPeriod],
  )

  const handleWalletChange = useCallback(
    (nextWallet: string) => {
      setSearchParams(
        (prev) =>
          serializeReportFlowFilters(
            { ...parseReportFlowFilters(prev), walletId: nextWallet || undefined },
            new URLSearchParams(prev),
          ),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const applyFilters = useCallback(
    (next: FlowFilters) => {
      setSearchParams(
        (prev) =>
          serializeReportFlowFilters(
            { ...next, walletId: walletId || undefined },
            new URLSearchParams(prev),
          ),
        { replace: true },
      )
    },
    [setSearchParams, walletId],
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

  const handleGroupSelect = useCallback((id: string) => {
    setActiveChartId((prev) => (prev === id ? null : id))
  }, [])

  const handleRowSelect = useCallback(
    (group: BreakdownGroup) => {
      handleGroupSelect(breakdownGroupChartId(group))
    },
    [handleGroupSelect],
  )

  const handleDrillDown = useCallback(
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

  const handleChartTopChange = useCallback(
    (next: number) => {
      patchParams({ chartTop: String(next) })
      setActiveChartId(null)
    },
    [patchParams],
  )

  const handleClearChartSelection = useCallback(() => {
    setActiveChartId(null)
  }, [])

  const parentCategoryName =
    categoryId && groupBy === 'categorySub'
      ? categories.find((c) => String(c.id) === categoryId)?.name
      : null

  return (
    <ReportPageShell
      sidebarOpen={sidebarOpen}
      onOpenSidebar={openPanel}
      onCloseSidebar={closePanel}
      filterCount={filterCount + (walletId ? 1 : 0)}
      sidebar={
        <ReportSidebar
          open={sidebarOpen}
          onClose={closePanel}
          period={period}
          onPeriodModeChange={handlePeriodModeChange}
          onPeriodNavigate={handlePeriodNavigate}
          onPeriodJumpToCurrent={handlePeriodJumpToCurrent}
          onPeriodRangeChange={handlePeriodRangeChange}
          walletId={walletId}
          onWalletChange={handleWalletChange}
          activeFilters={filters}
          onApplyFilters={applyFilters}
          reportDirection={direction}
          chartStyle={chartStyle}
          onChartStyleChange={setChartStyle}
          extraSections={
            <>
              <ReportGroupingSection
                groupBy={groupBy}
                direction={direction}
                onGroupByChange={handleGroupByChange}
                onDirectionChange={handleDirectionChange}
              />
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <ReportChartTopSection
                value={chartTop}
                groupCount={data.groups.length}
                onChange={handleChartTopChange}
              />
            </>
          }
        />
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <ReportFilterChips filters={filters} categories={categories} onChange={applyFilters} />

        <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Okres: {period.dateFrom} — {period.dateTo}
            {parentCategoryName && (
              <> · Podkategorie: <strong className="font-medium">{parentCategoryName}</strong></>
            )}
          </span>
          {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </p>

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
          groupBy={groupBy}
          chartTop={chartTop}
          activeId={activeChartId}
          onGroupClick={handleGroupSelect}
          onRowSelect={handleRowSelect}
          onDrillDown={handleDrillDown}
          onClearSelection={handleClearChartSelection}
          direction={direction}
          chartStyle={chartStyle}
          dateFrom={period.dateFrom}
          dateTo={period.dateTo}
        />
      </div>
    </ReportPageShell>
  )
}
