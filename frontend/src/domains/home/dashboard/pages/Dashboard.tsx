import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Scale, AlertCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'
import Pill from '@/shared/components/Pill'
import ListTextTooltip from '@/shared/components/ListTextTooltip'
import { STATUS_PILL } from '@/shared/constants/pillMaps'
import { STATUS_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import { fetchTransactionStats, fetchTransactions, type TransactionStats } from '@/shared/api/transactions'
import { Transaction } from '@/shared/types'
import { formatAmount } from '@/shared/utils/format'
import { currentMonthParam, monthLabel, shiftMonth } from '@/shared/utils/monthQuery'
import {
  parseDashboardSearchParams,
  serializeDashboardSearchParams,
} from '../utils/dashboardUrlParams'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  sub?: string
}

function StatCard({ label, value, icon, iconBg, valueColor, sub }: StatCardProps) {
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

function ItemAmounts({ tx }: { tx: Transaction }) {
  if (tx.items.length === 1) {
    const amt = tx.items[0].amount
    return (
      <span className={['font-mono text-sm font-medium', amt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'].join(' ')}>
        {formatAmount(amt, true)}
      </span>
    )
  }
  return (
    <div className="space-y-0.5">
      {tx.items.map((item) => (
        <div key={item.id} className={['font-mono text-xs font-medium', item.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'].join(' ')}>
          {formatAmount(item.amount, true)}
        </div>
      ))}
    </div>
  )
}

function RecentCard({ tx }: { tx: Transaction }) {
  return (
    <div className="px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
          <ListTextTooltip
            text={tx.description}
            className="text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono">{tx.date}</span>
            <span>·</span>
            <span className="truncate">{tx.paidFrom ?? '—'}</span>
            <ArrowRight size={9} className="shrink-0" />
            <span className="truncate">{tx.paidTo ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {tx.items[0]?.wallet && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{tx.items[0].wallet}</span>
            )}
            {tx.items[0]?.concern && (
              <>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tx.items[0].concern}</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <ItemAmounts tx={tx} />
          <Pill variant={STATUS_PILL[tx.status]}>{STATUS_LABEL_BY_VALUE[tx.status]}</Pill>
        </div>
      </div>
    </div>
  )
}

const EMPTY_STATS: TransactionStats = { income: 0, expenses: 0, balance: 0, unclassifiedCount: 0 }

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = useMemo(() => parseDashboardSearchParams(searchParams), [searchParams])

  const [stats, setStats]   = useState<TransactionStats>(EMPTY_STATS)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const setMonth = useCallback(
    (month: string) => {
      setSearchParams(
        serializeDashboardSearchParams({ ...urlState, month }),
        { replace: true },
      )
    },
    [setSearchParams, urlState],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchTransactionStats({ month: urlState.month }),
      fetchTransactions(
        { dateFrom: urlState.dateFrom, dateTo: urlState.dateTo },
        'date',
        'desc',
        1,
        10,
      ),
    ])
      .then(([statsResp, recentResp]) => {
        if (cancelled) return
        setStats(statsResp)
        setRecent(recentResp.data)
      })
      .catch(() => {
        if (!cancelled) {
          setStats(EMPTY_STATS)
          setRecent([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [urlState.month, urlState.dateFrom, urlState.dateTo])

  const txCount = stats.transactionCount ?? 0
  const isCurrentMonth = urlState.month === currentMonthParam()

  return (
    <div className="p-4 md:p-6 max-w-screen-2xl">
      <PageHeader
        title="Dashboard"
        subtitle={isCurrentMonth ? 'Podsumowanie finansów domowych' : `Okres: ${monthLabel(urlState.month)}`}
      />

      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(urlState.month, -1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[10rem] text-center">
          {monthLabel(urlState.month)}
        </span>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(urlState.month, 1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Następny miesiąc"
        >
          <ChevronRight size={18} />
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => setMonth(currentMonthParam())}
            className="text-xs font-medium text-[#c9a96e] hover:text-[#d4bc8e] transition-colors"
          >
            Bieżący miesiąc
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 md:mb-8">
        <StatCard
          label="Przychody"
          value={formatAmount(stats.income)}
          icon={<TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
          valueColor="text-emerald-600 dark:text-emerald-400"
          sub={txCount > 0 ? `${txCount} transakcji w okresie` : 'Brak transakcji w okresie'}
        />
        <StatCard
          label="Wydatki"
          value={formatAmount(stats.expenses)}
          icon={<TrendingDown size={18} className="text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950"
          valueColor="text-red-600 dark:text-red-400"
        />
        <StatCard
          label="Bilans"
          value={formatAmount(stats.balance, true)}
          icon={<Scale size={18} className={stats.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} />}
          iconBg={stats.balance >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-orange-50 dark:bg-orange-950'}
          valueColor={stats.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}
        />
        <StatCard
          label="Do klasyfikacji"
          value={String(stats.unclassifiedCount)}
          icon={<AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-50 dark:bg-amber-950"
          valueColor={stats.unclassifiedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}
          sub="w wybranym okresie"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ostatnie transakcje</h2>
          <Link
            to={`/transactions?month=${urlState.month}`}
            className="flex items-center gap-1 text-xs font-medium text-[#c9a96e] hover:text-[#d4bc8e] transition-colors"
          >
            Wszystkie <ArrowRight size={12} />
          </Link>
        </div>

        {loading && recent.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-600">Ładowanie…</div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-600">Brak transakcji w tym okresie</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Data', 'Opis', 'Skąd', 'Dokąd', 'Portfel', 'Dotyczy', 'Kwota', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {recent.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">{tx.date}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-200 max-w-[220px]">
                        <ListTextTooltip text={tx.description} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.paidFrom ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.paidTo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.items[0]?.wallet ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.items[0]?.concern ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><ItemAmounts tx={tx} /></td>
                      <td className="px-4 py-3">
                        <Pill variant={STATUS_PILL[tx.status]}>{STATUS_LABEL_BY_VALUE[tx.status]}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800/60">
              {recent.map((tx) => <RecentCard key={tx.transactionId} tx={tx} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
