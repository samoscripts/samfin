import { Pencil } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatAmount } from '@/shared/utils/format'

export interface TransactionDetailsPanelProps {
  tx: Transaction
  onEdit: () => void
}

export default function TransactionDetailsPanel({ tx, onEdit }: TransactionDetailsPanelProps) {
  const directionLabel = tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'
  const directionCls =
    tx.direction === 'INCOME'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  const items =
    tx.items.length > 0
      ? tx.items
      : [{ amount: tx.amount, wallet: null, concern: null, category: null, description: null }]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{tx.date}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${directionCls}`}>
            {directionLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{tx.description ?? '—'}</p>
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatAmount(tx.amount)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <DetailSection label="Status">
          <StatusBadge status={tx.status} />
        </DetailSection>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <DetailSection label="Strony transakcji">
          <DetailRow label="Skąd" value={tx.paidFrom} />
          <DetailRow label="Dokąd" value={tx.paidTo} />
        </DetailSection>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        {items.map((item, i) => (
          <div key={i} className="space-y-3">
            {items.length > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Pozycja {i + 1}
                </p>
                <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                  {formatAmount(item.amount)}
                </span>
              </div>
            )}
            {items.length === 1 && (
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Klasyfikacja
              </p>
            )}
            <DetailRow label="Portfel" value={item.wallet} />
            <DetailRow label="Dotyczy" value={item.concern} />
            <DetailRow label="Kategoria" value={item.category} />
            {item.description && <DetailRow label="Opis pozycji" value={item.description} />}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1c4230' }}
        >
          <Pencil size={14} />
          Edytuj
        </button>
      </div>
    </div>
  )
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 text-right">{value ?? '—'}</span>
    </div>
  )
}
