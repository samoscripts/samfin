import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, TrendingDown, TrendingUp, Scale, List } from 'lucide-react'
import { fetchAnalyticsReport, type AnalyticsReportResponse } from '@/shared/api/analytics'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { formatAmount } from '@/shared/utils/format'
import { currentYearMonth } from '@/shared/utils/periodUrl'
import ReportPageShell from '@/domains/home/reports/shared/components/ReportPageShell'
import ReportScopePanelContent from '@/domains/home/reports/shared/components/ReportScopePanelContent'
import { useReportRightPanel } from '@/domains/home/reports/shared/hooks/useReportRightPanel'
import {
  buildCurrentPeriodState,
  buildReportPeriodApiParams,
  formatReportPeriodDisplay,
  navigatePeriod,
  parseReportPeriodState,
  serializeReportPeriodState,
  switchPeriodMode,
  type ReportPeriodMode,
} from '@/domains/home/reports/shared/utils/reportPeriod'

export default function AnalyticsReport() {
  const [searchParams, setSearchParams] = useSearchParams()

  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(
    () => parseReportPeriodState(searchParams, defaults),
    [searchParams, defaults],
  )
  const walletId = searchParams.get('walletId') ?? ''

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [data, setData] = useState<AnalyticsReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => setWallets([]))
  }, [])

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

  const handleWalletChange = useCallback(
    (nextWallet: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (nextWallet) params.set('walletId', nextWallet)
        else params.delete('walletId')
        return params
      }, { replace: true })
    },
    [setSearchParams],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAnalyticsReport({
      ...buildReportPeriodApiParams(period),
      walletId: walletId || undefined,
    })
      .then((resp) => {
        if (!cancelled) setData(resp)
      })
      .catch(() => {
        if (!cancelled) {
          setData(null)
          setError('Nie udało się załadować raportu.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, walletId])

  const walletName = walletId
    ? wallets.find((w) => String(w.id) === walletId)?.name
    : undefined

  const filtersContent = (
    <ReportScopePanelContent
      period={period}
      onPeriodModeChange={handlePeriodModeChange}
      onPeriodNavigate={handlePeriodNavigate}
      onPeriodJumpToCurrent={handlePeriodJumpToCurrent}
      onPeriodRangeChange={handlePeriodRangeChange}
      walletId={walletId}
      onWalletChange={handleWalletChange}
    />
  )

  const { panelOpen, openPanel, closePanel, panelPortal } = useReportRightPanel({
    filtersContent,
    filtersTabLabel: 'Okres i portfel',
  })

  return (
    <>
    <ReportPageShell
      sidebarOpen={panelOpen}
      onOpenSidebar={openPanel}
      onCloseSidebar={closePanel}
      filterCount={walletId ? 1 : 0}
      sidebarButtonLabel="Okres i portfel"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : data ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Okres:{' '}
              {formatReportPeriodDisplay({
                mode: period.mode,
                dateFrom: data.dateFrom ?? period.dateFrom,
                dateTo: data.dateTo ?? period.dateTo,
                monthParam: period.monthParam,
                year: period.year,
                quarter: period.quarter,
              })}
              {walletName && <> · Portfel: {walletName}</>}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Przychody"
                value={formatAmount(data.income)}
                icon={<TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />}
                iconBg="bg-emerald-50 dark:bg-emerald-950"
                valueColor="text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                label="Wydatki"
                value={formatAmount(data.expenses)}
                icon={<TrendingDown size={18} className="text-red-600 dark:text-red-400" />}
                iconBg="bg-red-50 dark:bg-red-950"
                valueColor="text-red-600 dark:text-red-400"
              />
              <StatCard
                label="Saldo"
                value={formatAmount(data.balance, true)}
                icon={<Scale size={18} />}
                iconBg="bg-blue-50 dark:bg-blue-950"
                valueColor={
                  data.balance >= 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-orange-600 dark:text-orange-400'
                }
              />
              <StatCard
                label="Transakcje"
                value={String(data.transactionCount)}
                icon={<List size={18} className="text-gray-600 dark:text-gray-400" />}
                iconBg="bg-gray-50 dark:bg-gray-800"
                sub={`${data.unclassifiedCount} niesklasyfikowanych`}
              />
            </div>
          </>
        ) : null}
      </div>
    </ReportPageShell>
    {panelPortal}
    </>
  )
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  valueColor,
  sub,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  sub?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-start gap-4">
      <div className={['p-2.5 rounded-lg shrink-0', iconBg].join(' ')}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p
          className={[
            'text-2xl font-semibold mt-1 tabular-nums',
            valueColor ?? 'text-gray-900 dark:text-gray-100',
          ].join(' ')}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
