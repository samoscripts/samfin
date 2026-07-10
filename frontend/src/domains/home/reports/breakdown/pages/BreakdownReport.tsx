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
import {
  countReportFilters,
  parseReportFlowFilters,
  serializeReportFlowFilters,
} from '@/domains/home/reports/shared/components/ReportSidebar'
import ReportFiltersPanelContent, {
  type ReportSavedPanelProps,
} from '@/domains/home/reports/shared/components/ReportFiltersPanelContent'
import { useReportRightPanel } from '@/domains/home/reports/shared/hooks/useReportRightPanel'
import { preserveReportPanelParams } from '@/domains/home/reports/shared/utils/reportPanelUrl'
import { useReportSaved } from '@/domains/home/reports/shared/hooks/useReportSaved'
import ReportChartTopSection from '@/domains/home/reports/shared/components/ReportChartTopSection'
import { ReportGroupingSection } from '@/domains/home/reports/shared/components/ReportSidebarSections'
import { parseChartTop, parseChartTopRaw, breakdownGroupChartId } from '@/domains/home/reports/shared/utils/chartTopGroups'
import { buildCurrentPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'
import {
  navigatePeriod,
  parseReportPeriodState,
  serializeReportPeriodState,
  switchPeriodMode,
  buildReportPeriodApiParams,
  formatReportPeriodDisplay,
  type ReportPeriodMode,
} from '@/domains/home/reports/shared/utils/reportPeriod'
import {
  applyBreakdownParams,
  captureBreakdownParams,
  REPORT_SAVED_ID_PARAM,
} from '@/domains/home/reports/shared/utils/reportSavedParams'
import type {
  BreakdownGroup,
  BreakdownGroupBy,
  BreakdownDirections,
  BreakdownReportData,
} from '@/domains/home/reports/shared/types/breakdown'
import {
  hasBothBreakdownDirections,
  parseBreakdownDirections,
  serializeBreakdownDirections,
} from '@/domains/home/reports/breakdown/utils/breakdownUrl'
import {
  parseBreakdownChartTab,
  resolveBreakdownChartTab,
  serializeBreakdownChartTab,
} from '@/domains/home/reports/breakdown/utils/breakdownChartType'
import type { BreakdownChartTab, BreakdownDirection } from '@/domains/home/reports/shared/types/breakdown'

type BreakdownChartSelection = { id: string; direction?: BreakdownDirection }
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

function emptyData(groupBy: BreakdownGroupBy, directions: BreakdownDirections): BreakdownReportData {
  return {
    dateFrom: '',
    dateTo: '',
    groupBy,
    direction: directions[0] ?? 'EXPENSE',
    directions,
    total: 0,
    itemCount: 0,
    averageAmount: 0,
    unclassifiedAmount: 0,
    groups: [],
  }
}

function buildBreakdownApiDirectionParams(directions: BreakdownDirections) {
  if (hasBothBreakdownDirections(directions)) {
    return { reportDirections: directions.join(',') }
  }
  return { reportDirection: directions[0] ?? 'EXPENSE' }
}

export default function BreakdownReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chartStyle, setChartStyle] = useChartStyle()

  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(
    () => parseReportPeriodState(searchParams, defaults),
    [searchParams, defaults],
  )
  const filters = useMemo(() => parseReportFlowFilters(searchParams), [searchParams])
  const groupBy = parseGroupBy(searchParams.get('groupBy'))
  const directions = useMemo(() => parseBreakdownDirections(searchParams), [searchParams])
  const bothDirections = hasBothBreakdownDirections(directions)
  const walletId = filters.walletId ?? ''
  const categoryId = filters.categoryId ?? ''

  const [categories, setCategories] = useState<Category[]>([])
  const [chartSelection, setChartSelection] = useState<BreakdownChartSelection | null>(null)
  const activeChartId = chartSelection?.id ?? null
  const activeChartDirection = chartSelection?.direction ?? null
  const [data, setData] = useState<BreakdownReportData>(() => emptyData(groupBy, directions))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const loadBreakdown = useCallback(() => {
    return fetchBreakdownReport({
      ...buildReportPeriodApiParams(period),
      groupBy,
      ...buildBreakdownApiDirectionParams(directions),
      walletId: filters.walletId,
      categoryId: filters.categoryId,
      concernId: filters.concernId,
      paidFromPartyId: filters.paidFromPartyId,
      paidToPartyId: filters.paidToPartyId,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      description: filters.description,
    })
  }, [period, groupBy, directions, filters])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadBreakdown()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Nie udało się załadować raportu.')
          setData(emptyData(groupBy, directions))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadBreakdown, groupBy, directions])

  useEffect(() => {
    if (effectiveChartTab === chartTabRaw) return
    setSearchParams(
      (prev) => serializeBreakdownChartTab(effectiveChartTab, directions, new URLSearchParams(prev)),
      { replace: true },
    )
  }, [effectiveChartTab, chartTabRaw, directions, setSearchParams])

  const chartTopDisplay = useMemo(
    () => parseChartTop(searchParams.get('chartTop'), data.groups.length),
    [searchParams, data.groups.length],
  )

  const chartTopSaved = useMemo(
    () => parseChartTopRaw(searchParams.get('chartTop')),
    [searchParams],
  )

  const chartTabRaw = parseBreakdownChartTab(searchParams.get('breakdownChart'))
  const effectiveChartTab = useMemo(
    () => resolveBreakdownChartTab(chartTabRaw, directions),
    [chartTabRaw, directions],
  )

  const reportSavedId = searchParams.get(REPORT_SAVED_ID_PARAM)

  const applySavedParams = useCallback(
    (params: Record<string, unknown>, savedId: number) => {
      const next = preserveReportPanelParams(
        searchParams,
        applyBreakdownParams(params, defaults, savedId),
      )
      setSearchParams(next, { replace: true })
    },
    [setSearchParams, defaults, searchParams],
  )

  const captureParams = useCallback(
    () =>
      captureBreakdownParams(period, groupBy, directions, chartTopSaved, {
        ...filters,
        walletId: walletId || undefined,
      }, effectiveChartTab) as unknown as Record<string, unknown>,
    [period, groupBy, directions, chartTopSaved, filters, walletId, effectiveChartTab],
  )

  const reportSaved = useReportSaved({
    type: 'breakdown',
    reportSavedId,
    setSearchParams,
    captureParams,
  })

  const savedReportPanel: ReportSavedPanelProps = {
    loadedReport: reportSaved.loadedReport,
    listRefreshKey: reportSaved.listRefreshKey,
    onApplyDraft: () => {},
    onCreateReport: reportSaved.createReport,
    onUpdateReport: reportSaved.updateReport,
    onRenameReport: reportSaved.renameReport,
    onSelectReport: (item) => reportSaved.selectReport(item, applySavedParams),
    onDeleteReport: reportSaved.deleteReport,
    loadReportList: reportSaved.loadList,
  }

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
      setChartSelection(null)
    },
    [patchParams, categoryId],
  )

  const handleDirectionsChange = useCallback(
    (nextDirections: BreakdownDirections) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        return serializeBreakdownDirections(nextDirections, params)
      }, { replace: true })
      setChartSelection(null)
    },
    [setSearchParams],
  )

  const handleChartTabChange = useCallback(
    (tab: BreakdownChartTab) => {
      setSearchParams(
        (prev) => serializeBreakdownChartTab(tab, directions, new URLSearchParams(prev)),
        { replace: true },
      )
      setChartSelection(null)
    },
    [setSearchParams, directions],
  )

  const handleGroupSelect = useCallback((id: string) => {
    setChartSelection((prev) => (prev?.id === id && !prev.direction ? null : { id }))
  }, [])

  const handleChartSegmentSelect = useCallback((id: string, direction: BreakdownDirection) => {
    setChartSelection((prev) =>
      prev?.id === id && prev.direction === direction ? null : { id, direction },
    )
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
      setChartSelection({ id: String(group.id) })
    },
    [patchParams],
  )

  const handleChartTopChange = useCallback(
    (next: number) => {
      patchParams({ chartTop: String(next) })
      setChartSelection(null)
    },
    [patchParams],
  )

  const handleClearChartSelection = useCallback(() => {
    setChartSelection(null)
  }, [])

  const parentCategoryName =
    categoryId && groupBy === 'categorySub'
      ? categories.find((c) => String(c.id) === categoryId)?.name
      : null

  const filtersContent = (
    <ReportFiltersPanelContent
      period={period}
      onPeriodModeChange={handlePeriodModeChange}
      onPeriodNavigate={handlePeriodNavigate}
      onPeriodJumpToCurrent={handlePeriodJumpToCurrent}
      onPeriodRangeChange={handlePeriodRangeChange}
      walletId={walletId}
      onWalletChange={handleWalletChange}
      activeFilters={filters}
      onApplyFilters={applyFilters}
      reportDirections={directions}
      chartStyle={chartStyle}
      onChartStyleChange={setChartStyle}
      extraSections={
        <>
          <ReportGroupingSection
            groupBy={groupBy}
            directions={directions}
            onGroupByChange={handleGroupByChange}
            onDirectionsChange={handleDirectionsChange}
          />
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <ReportChartTopSection
            value={chartTopDisplay}
            groupCount={data.groups.length}
            onChange={handleChartTopChange}
          />
        </>
      }
      savedReport={savedReportPanel}
    />
  )

  const { panelOpen, openPanel, closePanel, openTx, panelPortal, confirmDialogs } =
    useReportRightPanel({
      onMutated: () => {
        void loadBreakdown().then(setData).catch(() => {})
      },
      filtersContent,
    })

  return (
    <>
    <ReportPageShell
      sidebarOpen={panelOpen}
      onOpenSidebar={openPanel}
      onCloseSidebar={closePanel}
      filterCount={filterCount + (walletId ? 1 : 0)}
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
            Okres: {formatReportPeriodDisplay(period)}
            {parentCategoryName && (
              <> · Podkategorie: <strong className="font-medium">{parentCategoryName}</strong></>
            )}
          </span>
          {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {bothDirections && data.totals ? (
            <>
              <ReportStatCard
                label="Wydatki"
                value={formatAmount(data.totals.expenses)}
                valueColor="text-red-600 dark:text-red-400"
              />
              <ReportStatCard
                label="Wpływy"
                value={formatAmount(data.totals.income)}
                valueColor="text-emerald-600 dark:text-emerald-400"
              />
              <ReportStatCard
                label="Bilans"
                value={formatAmount(data.totals.net)}
                valueColor={
                  data.totals.net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              />
              <ReportStatCard label="Pozycji" value={String(data.itemCount)} />
            </>
          ) : (
            <>
              <ReportStatCard
                label="Suma"
                value={formatAmount(data.total)}
                valueColor={
                  directions[0] === 'INCOME'
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
            </>
          )}
        </div>

        <BreakdownCharts
          groups={data.groups}
          groupBy={groupBy}
          chartTop={chartTopDisplay}
          chartTab={effectiveChartTab}
          onChartTabChange={handleChartTabChange}
          activeId={activeChartId}
          activeDirection={activeChartDirection}
          onGroupClick={handleGroupSelect}
          onChartSegmentClick={handleChartSegmentSelect}
          onRowSelect={handleRowSelect}
          onDrillDown={handleDrillDown}
          onClearSelection={handleClearChartSelection}
          directions={directions}
          chartStyle={chartStyle}
          dateFrom={period.dateFrom}
          dateTo={period.dateTo}
          reportFilters={filters}
          onOpenTransaction={openTx}
        />
      </div>
    </ReportPageShell>
    {panelPortal}
    {confirmDialogs}
    </>
  )
}
