import { Pencil } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import Pill from '@/shared/components/Pill'
import ExpandableText from '@/shared/components/ExpandableText'
import { DIRECTION_PILL, STATUS_PILL } from '@/shared/constants/pillMaps'
import { DIRECTION_LABEL_BY_VALUE, STATUS_LABEL_BY_VALUE } from '../constants/labels'
import { formatAmount } from '@/shared/utils/format'
import TransactionHistorySection from './TransactionHistorySection'

export interface TransactionDetailsPanelProps {
  tx: Transaction
  onEdit: () => void
  onRestored: (updated: Transaction) => void
}

export default function TransactionDetailsPanel({ tx, onEdit, onRestored }: TransactionDetailsPanelProps) {
  const items =
    tx.items.length > 0
      ? tx.items
      : [{ amount: tx.amount, wallet: null, concern: null, category: null, description: null }]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{tx.date}</span>
          <Pill variant={DIRECTION_PILL[tx.direction]}>
            {DIRECTION_LABEL_BY_VALUE[tx.direction]}
          </Pill>
        </div>
        <ExpandableText
          text={tx.description}
          className="mb-1"
          textClassName="text-sm font-medium text-gray-900 dark:text-gray-100"
          lines={2}
        />
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatAmount(tx.amount)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <DetailSection label="Status">
          <Pill variant={STATUS_PILL[tx.status]}>{STATUS_LABEL_BY_VALUE[tx.status]}</Pill>
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
            {item.description && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">Opis pozycji</span>
                <ExpandableText
                  text={item.description}
                  className="flex-1 min-w-0 text-right"
                  textClassName="text-sm text-gray-900 dark:text-gray-100"
                  lines={2}
                />
              </div>
            )}
          </div>
        ))}

        <TransactionHistorySection tx={tx} onRestored={onRestored} />
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
