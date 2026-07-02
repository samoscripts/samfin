import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Loader2, TrendingDown, TrendingUp, Scale, List } from 'lucide-react'
import { fetchAnalyticsReport, type AnalyticsReportResponse } from '@/shared/api/analytics'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { useReportPeriodPanel } from '@/domains/home/reports/hooks/useReportPeriodPanel'
import PeriodNavigator from '@/shared/components/PeriodNavigator'
import PeriodSidebar from '@/shared/components/PeriodSidebar'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { formatAmount } from '@/shared/utils/format'
import {
  currentYearMonth,
  parseReportPeriod,
  paramToYearMonth,
  serializeReportMonthPeriod,
  serializeReportRangePeriod,
  withReportPeriodPanel,
} from '@/shared/utils/periodUrl'

export default function AnalyticsReport() {
  const periodTriggerRef = useRef<HTMLButtonElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: periodPanelOpen, openPanel, closePanel, portalRoot } = useReportPeriodPanel()
  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(() => parseReportPeriod(searchParams, defaults), [searchParams, defaults])
  const walletId = searchParams.get('walletId') ?? ''

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [data, setData] = useState<AnalyticsReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const walletExtra = useMemo(
    () => ({ walletId: walletId || undefined }),
    [walletId],
  )

  const handleMonthChange = useCallback(
    (monthParam: string) => {
      const ym = paramToYearMonth(monthParam)
      if (!ym) return
      setSearchParams(
        serializeReportMonthPeriod(ym.year, ym.month, defaults, walletExtra),
        { replace: true },
      )
    },
    [defaults, setSearchParams, walletExtra],
  )

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
      if (periodPanelOpen) params.set('panel', 'period')
      setSearchParams(params, { replace: true })
    },
    [period, defaults, setSearchParams, periodPanelOpen],
  )

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => setWallets([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = period.isCustomRange
      ? {
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          walletId: walletId || undefined,
        }
      : {
          year: period.year,
          month: period.month,
          walletId: walletId || undefined,
        }

    fetchAnalyticsReport(params)
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <PeriodNavigator
            monthParam={period.monthParam}
            isCustomRange={period.isCustomRange}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            showAdvanced
            advancedOpen={periodPanelOpen}
            onOpenAdvanced={openPanel}
            advancedButtonRef={periodTriggerRef}
            onMonthChange={handleMonthChange}
          />
          <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1 min-w-[200px] shrink-0">
            Portfel
            <DictionarySelect
              items={wallets}
              value={walletId}
              onChange={updateWallet}
              emptyLabel="Wszystkie portfele"
              valueType="string"
            />
          </label>
        </div>

        {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : data ? (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Okres: {data.dateFrom} — {data.dateTo}
            {walletId && wallets.find((w) => String(w.id) === walletId) && (
              <> · Portfel: {wallets.find((w) => String(w.id) === walletId)?.name}</>
            )}
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
              valueColor={data.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}
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

      {portalRoot &&
        createPortal(
          <PeriodSidebar
            open={periodPanelOpen}
            onClose={closePanel}
            year={period.year}
            month={period.month}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            isCustomRange={period.isCustomRange}
            onApplyMonth={handleApplyMonthPick}
            onApplyRange={handleRangeChange}
            returnFocusRef={periodTriggerRef}
          />,
          portalRoot,
        )}
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
        <p className={['text-2xl font-semibold mt-1 tabular-nums', valueColor ?? 'text-gray-900 dark:text-gray-100'].join(' ')}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
