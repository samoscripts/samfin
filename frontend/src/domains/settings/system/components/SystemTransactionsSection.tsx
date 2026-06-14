import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { fetchTransactions } from '@/shared/api/transactions'
import { clearAllTransactions, exportTransactionsJson } from '@/shared/api/system'
import SystemSection from './SystemSection'
import SystemOptionRow from './SystemOptionRow'

export default function SystemTransactionsSection() {
  const [transactionCount, setTransactionCount] = useState<number | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadCount = useCallback(() => {
    setIsLoadingCount(true)
    fetchTransactions({}, 'date', 'desc', 1, 1)
      .then((res) => setTransactionCount(res.meta.total))
      .catch(() => setTransactionCount(null))
      .finally(() => setIsLoadingCount(false))
  }, [])

  useEffect(() => {
    loadCount()
  }, [loadCount])

  const handleExport = async () => {
    setError('')
    setSuccessMessage('')
    setIsExporting(true)
    try {
      await exportTransactionsJson()
      setSuccessMessage('Eksport zakończony — plik JSON został pobrany.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wyeksportować transakcji.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleClear = async () => {
    setError('')
    setSuccessMessage('')
    setIsClearing(true)
    try {
      const result = await clearAllTransactions()
      setConfirmClear(false)
      setSuccessMessage(
        `Usunięto ${result.deletedCount} transakcji. Zresetowano ${result.importsReset} rekordów importu.`,
      )
      setTransactionCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wyczyścić transakcji.')
    } finally {
      setIsClearing(false)
    }
  }

  const countSuffix = isLoadingCount
    ? ''
    : transactionCount === null
      ? ''
      : ` (${transactionCount.toLocaleString('pl-PL')} w bazie)`

  const actionsDisabled = isExporting || isClearing || transactionCount === 0

  return (
    <>
      <SystemSection title="Transakcje">
        {(error || successMessage) && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 space-y-2">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="px-3 py-2 rounded-lg text-sm bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
                {successMessage}
              </div>
            )}
          </div>
        )}

        <SystemOptionRow
          title={`Eksport do JSON${countSuffix}`}
          description="Pobierz pełną kopię transakcji wraz z pozycjami i historią zmian."
          action={
            <button
              type="button"
              onClick={handleExport}
              disabled={actionsDisabled}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Eksportuj
            </button>
          }
        />

        <SystemOptionRow
          title="Wyczyść wszystkie transakcje"
          description="Trwale usuwa transakcje, pozycje i historię zmian. Resetuje statusy importów CSV. Zalecamy eksport przed wyczyszczeniem."
          action={
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={actionsDisabled}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isClearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Wyczyść
            </button>
          }
        />
      </SystemSection>

      <ConfirmDialog
        open={confirmClear}
        title="Wyczyścić wszystkie transakcje?"
        message={
          transactionCount !== null
            ? `Ta operacja trwale usunie ${transactionCount.toLocaleString('pl-PL')} transakcji wraz z pozycjami i historią zmian. Statusy importów CSV zostaną zresetowane. Operacja jest nieodwracalna.`
            : 'Ta operacja trwale usunie wszystkie transakcje wraz z pozycjami i historią zmian. Operacja jest nieodwracalna.'
        }
        confirmLabel="Wyczyść"
        cancelLabel="Anuluj"
        loading={isClearing}
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}
