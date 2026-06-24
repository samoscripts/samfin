import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, TrendingDown, TrendingUp, Scale, List } from 'lucide-react'
import { fetchAnalyticsReport, type AnalyticsReportResponse } from '@/shared/api/analytics'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { buildSearchParams, parsePositiveInt } from '@/shared/utils/urlQuery'
import { formatAmount } from '@/shared/utils/format'
import DictionarySelect from '@/shared/components/form/DictionarySelect'

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function AnalyticsReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaults = currentYearMonth()

  const year = useMemo(
    () => parsePositiveInt(searchParams.get('year')) ?? defaults.year,
    [searchParams, defaults.year],
  )
  const month = useMemo(() => {
    const m = parsePositiveInt(searchParams.get('month')) ?? defaults.month
    return m >= 1 && m <= 12 ? m : defaults.month
  }, [searchParams, defaults.month])

  const walletId = searchParams.get('walletId') ?? ''

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [data, setData] = useState<AnalyticsReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const updateParams = useCallback(
    (patch: { year?: number; month?: number; walletId?: string }) => {
      const nextYear = patch.year ?? year
      const nextMonth = patch.month ?? month
      const nextWallet = patch.walletId !== undefined ? patch.walletId : walletId
      const params = buildSearchParams({
        year: nextYear !== defaults.year ? nextYear : undefined,
        month: nextMonth !== defaults.month ? nextMonth : undefined,
        walletId: nextWallet || undefined,
      })
      setSearchParams(params, { replace: true })
    },
    [year, month, walletId, defaults.year, defaults.month, setSearchParams],
  )

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => setWallets([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAnalyticsReport({
      year,
      month,
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
  }, [year, month, walletId])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => y - i)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Rok
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => updateParams({ year: Number(e.target.value) })}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Miesiąc
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={month}
            onChange={(e) => updateParams({ month: Number(e.target.value) })}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1 min-w-[200px]">
          Portfel
          <DictionarySelect
            items={wallets}
            value={walletId}
            onChange={(id) => updateParams({ walletId: id == null ? '' : String(id) })}
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
