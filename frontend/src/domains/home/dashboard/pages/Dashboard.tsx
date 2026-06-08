import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Scale, AlertCircle, ArrowRight } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'
import StatusBadge from '@/shared/components/StatusBadge'
import { fetchTransactionStats, fetchTransactions, type TransactionStats } from '@/shared/api/transactions'
import { Transaction } from '@/shared/types'
import { formatAmount } from '@/shared/utils/format'

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
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description ?? '—'}</p>
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
          <StatusBadge status={tx.status} />
        </div>
      </div>
    </div>
  )
}

const EMPTY_STATS: TransactionStats = { income: 0, expenses: 0, balance: 0, unclassifiedCount: 0 }

export default function Dashboard() {
  const [stats, setStats]   = useState<TransactionStats>(EMPTY_STATS)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [totalIncome, setTotalIncome]   = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)

  useEffect(() => {
    fetchTransactionStats().then(setStats).catch(() => {})

    fetchTransactions({}, 'date', 'desc', 1, 10)
      .then((res) => setRecent(res.data))
      .catch(() => {})

    fetchTransactions({ direction: 'INCOME' }, 'date', 'desc', 1, 1)
      .then((res) => setTotalIncome(res.meta.total))
      .catch(() => {})

    fetchTransactions({ direction: 'EXPENSE' }, 'date', 'desc', 1, 1)
      .then((res) => setTotalExpense(res.meta.total))
      .catch(() => {})
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-screen-2xl">
      <PageHeader title="Dashboard" subtitle="Podsumowanie finansów domowych" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 md:mb-8">
        <StatCard
          label="Przychody"
          value={formatAmount(stats.income)}
          icon={<TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
          valueColor="text-emerald-600 dark:text-emerald-400"
          sub={`${totalIncome} transakcji`}
        />
        <StatCard
          label="Wydatki"
          value={formatAmount(stats.expenses)}
          icon={<TrendingDown size={18} className="text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950"
          valueColor="text-red-600 dark:text-red-400"
          sub={`${totalExpense} transakcji`}
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
          sub="transakcji bez klasyfikacji"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ostatnie transakcje</h2>
          <Link to="/transactions" className="flex items-center gap-1 text-xs font-medium text-[#c9a96e] hover:text-[#d4bc8e] transition-colors">
            Wszystkie <ArrowRight size={12} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-600">Brak transakcji</div>
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
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-200 max-w-[220px] truncate">{tx.description ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.paidFrom ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.paidTo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.items[0]?.wallet ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{tx.items[0]?.concern ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><ItemAmounts tx={tx} /></td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
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
