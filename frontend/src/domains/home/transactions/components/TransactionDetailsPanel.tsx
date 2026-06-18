import { Pencil, Sparkles } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import ExpandableText from '@/shared/components/ExpandableText'
import TransactionHistorySection from './TransactionHistorySection'
import TransactionSummaryCard from './TransactionSummaryCard'

export interface TransactionDetailsPanelProps {
  tx: Transaction
  onEdit: () => void
  onRestored: (updated: Transaction) => void
  onCreateRule?: () => void
  canCreateRule?: boolean
}

export default function TransactionDetailsPanel({
  tx,
  onEdit,
  onRestored,
  onCreateRule,
  canCreateRule = false,
}: TransactionDetailsPanelProps) {
  const items =
    tx.items.length > 0
      ? tx.items
      : [{ amount: tx.amount, wallet: null, concern: null, category: null, description: null }]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <TransactionSummaryCard tx={tx} className="border-0 rounded-none" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {items.some((item) => item.description) && (
          <>
            {items.map(
              (item, i) =>
                item.description && (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">
                      {items.length > 1 ? `Opis pozycji ${i + 1}` : 'Opis pozycji'}
                    </span>
                    <ExpandableText
                      text={item.description}
                      className="flex-1 min-w-0 text-right"
                      textClassName="text-sm text-gray-900 dark:text-gray-100"
                      lines={2}
                    />
                  </div>
                ),
            )}
          </>
        )}

        <TransactionHistorySection tx={tx} onRestored={onRestored} />
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-2">
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1c4230' }}
        >
          <Pencil size={14} />
          Edytuj
        </button>
        {onCreateRule && (
          <button
            type="button"
            onClick={onCreateRule}
            disabled={!canCreateRule}
            title={
              canCreateRule
                ? undefined
                : 'Brak podmiotu OWN po właściwej stronie (Skąd przy wydatku, Dokąd przy wpływie) spełniającego kryteria reguł'
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles size={14} />
            Utwórz regułę
          </button>
        )}
      </div>
    </div>
  )
}
