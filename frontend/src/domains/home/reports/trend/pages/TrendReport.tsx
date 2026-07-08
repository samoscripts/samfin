import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

import { currentYearMonth } from '@/shared/utils/periodUrl'

import { Loader2 } from 'lucide-react'

import ReportPageShell from '@/domains/home/reports/shared/components/ReportPageShell'

import { useReportSidebar } from '@/domains/home/reports/shared/components/ReportSidebar'

import { buildCurrentPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'

import {

  navigatePeriod,

  parseReportPeriodState,

  serializeReportPeriodState,

  switchPeriodMode,

  type ReportPeriodMode,

} from '@/domains/home/reports/shared/utils/reportPeriod'

import TrendChart from '@/domains/home/reports/trend/components/TrendChart'

import TrendFilterChips from '@/domains/home/reports/trend/components/TrendFilterChips'

import TrendGranularityTabs from '@/domains/home/reports/trend/components/TrendGranularityTabs'

import TrendPeriodTransactions from '@/domains/home/reports/trend/components/TrendPeriodTransactions'

import TrendSidebar from '@/domains/home/reports/trend/components/TrendSidebar'

import { fetchTrendReport, type TrendReportParams } from '@/shared/api/trend'

import type {
  TrendBarSelection,
  TrendGranularity,
  TrendQueryState,
  TrendReportData,
} from '@/domains/home/reports/trend/types/trend'

import { trendGranularityLabel } from '@/domains/home/reports/trend/utils/trendGranularity'

import {

  countTrendQueryState,

  parseTrendQueryState,

  serializeTrendQueryState,

  trendFilterParamsSignature,

} from '@/domains/home/reports/trend/utils/trendUrl'

import { fetchCategories, type Category } from '@/shared/api/categories'

import { fetchConcerns, type Concern } from '@/shared/api/concerns'

import { fetchWallets, type Wallet } from '@/shared/api/wallets'

import { useChartStyle } from '@/shared/hooks/useChartStyle'
import { useTransactionPanel, resolveRightPanelOwner } from '@/domains/home/transactions/panel'

function serializeList(list: string[]): string | undefined {
  return list.length > 0 ? list.join(',') : undefined
}

function emptyTrendData(
  dateFrom: string,
  dateTo: string,
  query: TrendQueryState,
): TrendReportData {
  return {
    dateFrom,
    dateTo,
    granularity: query.granularity ?? 'month',
    seriesBy: query.seriesBy,
    points: [],
  }
}

function buildTrendParams(
  dateFrom: string,
  dateTo: string,
  query: TrendQueryState,
): TrendReportParams {
  const params: TrendReportParams = {
    dateFrom,
    dateTo,
    trendSeriesBy: query.seriesBy,
    trendDirections: query.directions.join(','),
  }
  if (query.granularity) params.trendGranularity = query.granularity
  if (query.seriesBy === 'description') params.trendTerms = serializeList(query.terms)
  if (query.seriesBy === 'category') params.trendCategoryIds = serializeList(query.categoryIds)
  if (query.seriesBy === 'wallet') params.trendWalletIds = serializeList(query.walletIds)
  if (query.seriesBy === 'concern') params.trendConcernIds = serializeList(query.concernIds)

  const n = query.narrow
  if (n.description) params.description = n.description
  if (n.categoryId) params.categoryId = n.categoryId
  if (n.walletId) params.walletId = n.walletId
  if (n.concernId) params.concernId = n.concernId
  if (n.amountMin) params.amountMin = n.amountMin
  if (n.amountMax) params.amountMax = n.amountMax
  if (n.paidFromPartyId) params.paidFromPartyId = n.paidFromPartyId
  if (n.paidToPartyId) params.paidToPartyId = n.paidToPartyId

  return params
}

export default function TrendReport() {

  const [searchParams, setSearchParams] = useSearchParams()

  const { open: sidebarOpen, openPanel, closePanel } = useReportSidebar()

  const [chartStyle, setChartStyle] = useChartStyle()

  const [categories, setCategories] = useState<Category[]>([])

  const [wallets, setWallets] = useState<Wallet[]>([])

  const [concerns, setConcerns] = useState<Concern[]>([])

  const [barSelection, setBarSelection] = useState<TrendBarSelection | null>(null)



  const defaults = useMemo(() => currentYearMonth(), [])

  const period = useMemo(

    () => parseReportPeriodState(searchParams, defaults),

    [searchParams, defaults],

  )

  const trendQuery = useMemo(

    () => parseTrendQueryState(searchParams, period),

    [searchParams, period],

  )

  const chartType = searchParams.get('chart') === 'line' ? 'line' : 'bar'

  const filterCount = countTrendQueryState(trendQuery)

  const trendFilterSignature = useMemo(

    () => trendFilterParamsSignature(searchParams),

    [searchParams],

  )



  useEffect(() => {

    Promise.all([fetchCategories(), fetchWallets(), fetchConcerns()])

      .then(([cat, w, c]) => {

        setCategories(cat)

        setWallets(w)

        setConcerns(c)

      })

      .catch(() => {

        setCategories([])

        setWallets([])

        setConcerns([])

      })

  }, [])



  const [data, setData] = useState<TrendReportData>(() =>
    emptyTrendData(period.dateFrom, period.dateTo, trendQuery),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrend = useCallback(() => {
    return fetchTrendReport(buildTrendParams(period.dateFrom, period.dateTo, trendQuery))
  }, [period.dateFrom, period.dateTo, trendQuery])

  const { openTx: openTxRaw, transactionPanelPortal, confirmDialogs } = useTransactionPanel({
    onMutated: () => {
      void loadTrend().then(setData).catch(() => {})
    },
  })
  const panelOwner = resolveRightPanelOwner(searchParams)

  const openTx = useCallback(
    (txId: number) => {
      closePanel()
      openTxRaw(txId)
    },
    [closePanel, openTxRaw],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadTrend()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Nie udało się załadować raportu.')
          setData(emptyTrendData(period.dateFrom, period.dateTo, trendQuery))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadTrend, period.dateFrom, period.dateTo, trendQuery])



  useEffect(() => {

    setBarSelection(null)

  }, [

    period.dateFrom,

    period.dateTo,

    period.mode,

    trendQuery.granularity,

    trendFilterSignature,

    chartType,

  ])



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



  const applyTrendQuery = useCallback(

    (next: typeof trendQuery) => {

      setSearchParams(

        (prev) => serializeTrendQueryState(next, new URLSearchParams(prev), period.mode),

        { replace: true },

      )

    },

    [setSearchParams, period.mode],

  )



  const handleGranularityChange = useCallback(

    (granularity: TrendGranularity) => {

      applyTrendQuery({ ...trendQuery, granularity })

    },

    [applyTrendQuery, trendQuery],

  )



  const toggleChart = useCallback(

    (type: 'line' | 'bar') => {

      setSearchParams((prev) => {

        const params = new URLSearchParams(prev)

        if (type === 'line') params.set('chart', 'line')
        else params.delete('chart')

        return params

      }, { replace: true })

    },

    [setSearchParams],

  )



  const handleBarClick = useCallback((selection: TrendBarSelection) => {

    setBarSelection((prev) =>

      prev?.period === selection.period && prev?.dataKey === selection.dataKey

        ? null

        : selection,

    )

  }, [])



  const subtitle =

    trendQuery.seriesBy === 'none'

      ? `Trend ${trendGranularityLabel(data.granularity).toLowerCase()}`

      : `Porównanie ${trendGranularityLabel(data.granularity).toLowerCase()}`



  return (

    <>

    <ReportPageShell

      sidebarOpen={sidebarOpen}

      onOpenSidebar={openPanel}

      onCloseSidebar={closePanel}

      filterCount={filterCount}

      sidebar={

        <TrendSidebar

          open={sidebarOpen}

          onClose={closePanel}

          period={period}

          onPeriodModeChange={handlePeriodModeChange}

          onPeriodNavigate={handlePeriodNavigate}

          onPeriodJumpToCurrent={handlePeriodJumpToCurrent}

          onPeriodRangeChange={handlePeriodRangeChange}

          activeQuery={trendQuery}

          appliedFilterSignature={trendFilterSignature}

          onApplyQuery={applyTrendQuery}

          chartStyle={chartStyle}

          onChartStyleChange={setChartStyle}

        />

      }

    >

      <div className="space-y-5">

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <TrendFilterChips

          query={trendQuery}

          categories={categories}

          wallets={wallets}

          concerns={concerns}

          onChange={applyTrendQuery}

        />



        <div className="flex flex-wrap items-center gap-3">

          <div className="flex gap-1.5">

            {(['line', 'bar'] as const).map((type) => (

              <button

                key={type}

                type="button"

                onClick={() => toggleChart(type)}

                className={[

                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',

                  chartType === type

                    ? 'bg-[#163526] text-white dark:bg-[#c9a96e] dark:text-[#163526]'

                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',

                ].join(' ')}

              >

                {type === 'line' ? 'Liniowy' : 'Słupkowy'}

              </button>

            ))}

          </div>



          <TrendGranularityTabs

            periodMode={period.mode}

            value={trendQuery.granularity ?? data.granularity}

            onChange={handleGranularityChange}

          />

        </div>



        <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">

          <span>{subtitle} · {period.dateFrom} — {period.dateTo}</span>

          {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}

        </p>



        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">

          <TrendChart

            data={data}

            chartType={chartType}

            directions={trendQuery.directions}

            chartStyle={chartStyle}

            activeBar={barSelection}

            onBarClick={chartType === 'bar' ? handleBarClick : undefined}

          />



          {chartType === 'bar' && (

            <TrendPeriodTransactions

              selection={barSelection}

              query={trendQuery}

              onOpenTransaction={openTx}

              onClose={() => setBarSelection(null)}

            />

          )}

        </div>

      </div>

    </ReportPageShell>

    {panelOwner === 'transaction' && transactionPanelPortal}

    {confirmDialogs}

    </>

  )

}


