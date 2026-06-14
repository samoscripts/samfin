import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, History, Loader2, RotateCcw } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import {
  fetchTransactionHistory,
  restoreTransactionHistory,
  type TransactionChangeLogEntry,
  type TransactionSnapshotItem,
} from '@/shared/api/transactions'
import { formatAmount } from '@/shared/utils/format'

export interface TransactionHistorySectionProps {
  tx: Transaction
  onRestored: (updated: Transaction) => void
}

export default function TransactionHistorySection({ tx, onRestored }: TransactionHistorySectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [entries, setEntries] = useState<TransactionChangeLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTransactionHistory(tx.transactionId, 1, 20)
      setEntries(res.data)
    } catch {
      setError('Nie udało się załadować historii.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [tx.transactionId])

  useEffect(() => {
    if (expanded) loadHistory()
  }, [expanded, loadHistory])

  useEffect(() => {
    setExpanded(false)
    setEntries([])
    setError(null)
  }, [tx.transactionId])

  const handleRestore = async () => {
    if (restoreId === null) return
    setRestoring(true)
    try {
      const updated = await restoreTransactionHistory(tx.transactionId, restoreId)
      onRestored(updated)
      setRestoreId(null)
      await loadHistory()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message ?? 'Nie udało się przywrócić wersji.')
      setRestoreId(null)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <History size={13} />
            Historia zmian
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-1">
            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400 py-2 justify-center">
                <Loader2 size={12} className="animate-spin" />
                Ładowanie…
              </div>
            )}

            {error && !loading && <p className="text-[11px] text-red-600 dark:text-red-400 px-1">{error}</p>}

            {!loading && !error && entries.length === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 py-1">Brak zapisanych zmian.</p>
            )}

            {!loading &&
              entries.map((entry) => (
                <HistoryEntryRow key={entry.id} entry={entry} onRestore={() => setRestoreId(entry.id)} />
              ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={restoreId !== null}
        title="Przywrócić tę wersję?"
        message="Aktualna klasyfikacja zostanie zastąpiona wybraną wersją. Zapis pojawi się jako nowy wpis w historii."
        confirmLabel="Przywróć"
        cancelLabel="Anuluj"
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => setRestoreId(null)}
      />
    </>
  )
}

function HistoryEntryRow({
  entry,
  onRestore,
}: {
  entry: TransactionChangeLogEntry
  onRestore: () => void
}) {
  const { snapshot } = entry
  const items = snapshot.items?.length ? snapshot.items : []
  const parties = `${snapshot.paidFrom ?? '—'} → ${snapshot.paidTo ?? '—'}`

  return (
    <div className="group rounded-md border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="font-mono shrink-0">{formatHistoryDate(entry.createdAt)}</span>
            <span className="shrink-0">·</span>
            <span className="truncate">{entry.createdBy}</span>
          </div>

          {items.length === 1 ? (
            <p
              className="text-[11px] text-gray-700 dark:text-gray-300 truncate leading-tight"
              title={`${parties} · ${formatItemLine(items[0], false)}`}
            >
              <span className="text-gray-500 dark:text-gray-400">{parties}</span>
              <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
              {formatItemLine(items[0], false)}
            </p>
          ) : (
            <div className="space-y-px leading-tight">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={parties}>
                {parties}
              </p>
              {items.map((item, i) => (
                <p
                  key={i}
                  className="text-[11px] text-gray-700 dark:text-gray-300 truncate font-mono"
                  title={formatItemLine(item, true)}
                >
                  {formatItemLine(item, true)}
                </p>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRestore}
          title="Przywróć"
          className="shrink-0 p-1 rounded text-gray-400 hover:text-[#c9a96e] hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors opacity-60 group-hover:opacity-100"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  )
}

function formatHistoryDate(iso: string): string {
  const d = iso.replace(' ', 'T')
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16)
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatItemLine(item: TransactionSnapshotItem, showAmount: boolean): string {
  const parts = [item.wallet, item.concern, item.category].map((v) => v ?? '—')
  const classification = parts.join(' · ')
  if (!showAmount) return classification
  return `${formatAmount(item.amount)}  ${classification}`
}
