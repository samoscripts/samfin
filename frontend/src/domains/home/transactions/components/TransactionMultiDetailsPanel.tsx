import { AlertCircle, Pencil, Sparkles } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import { formatAmount } from '@/shared/utils/format'

export interface TransactionMultiDetailsPanelProps {
  transactions: Transaction[]
  selectionMixed: boolean
  onEdit: () => void
  onApplyRules: () => void
}

export default function TransactionMultiDetailsPanel({
  transactions,
  selectionMixed,
  onEdit,
  onApplyRules,
}: TransactionMultiDetailsPanelProps) {
  const count = transactions.length
  const countLabel =
    count === 1
      ? '1 transakcja'
      : count < 5
        ? `${count} transakcje`
        : `${count} transakcji`

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Zaznaczone do edycji
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{countLabel}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <ul className="space-y-2">
          {transactions.map((tx) => (
            <li
              key={tx.transactionId}
              className="rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{tx.date}</span>
                <DirectionBadge direction={tx.direction} />
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {tx.description ?? '—'}
              </p>
              <p className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 mt-1">
                {formatAmount(tx.amount)}
              </p>
              {(tx.paidFrom || tx.paidTo) && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {tx.paidFrom ?? '—'} → {tx.paidTo ?? '—'}
                </p>
              )}
            </li>
          ))}
        </ul>

        {selectionMixed && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
            <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Nie można masowo edytować transakcji o różnym typie (wpływ i wydatek). Zmień zaznaczenie lub
              edytuj pojedynczo.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-2">
        <button
          onClick={onApplyRules}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#c9a96e]/50 text-[#8a7340] dark:text-[#c9a96e] hover:bg-[#c9a96e]/10 transition-colors"
        >
          <Sparkles size={14} />
          Zastosuj reguły
        </button>
        <button
          onClick={onEdit}
          disabled={selectionMixed}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#1c4230' }}
        >
          <Pencil size={14} />
          Edytuj
        </button>
      </div>
    </div>
  )
}

function DirectionBadge({ direction }: { direction: Transaction['direction'] }) {
  const label = direction === 'INCOME' ? 'Wpływ' : 'Wydatek'
  const cls =
    direction === 'INCOME'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}
