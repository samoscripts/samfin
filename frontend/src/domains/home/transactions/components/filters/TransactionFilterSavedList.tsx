import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import type { TransactionFilterSaved } from '@/shared/api/transactionFilterSaved'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import FormError from '@/shared/components/form/FormError'
import { btnSecondary } from '@/shared/components/form/formClasses'

interface TransactionFilterSavedListProps {
  items: TransactionFilterSaved[]
  loading: boolean
  error: string | null
  activeId: number | null
  onSelect: (item: TransactionFilterSaved) => void
  onDelete: (item: TransactionFilterSaved) => void
}

export default function TransactionFilterSavedList({
  items,
  loading,
  error,
  activeId,
  onSelect,
  onDelete,
}: TransactionFilterSavedListProps) {
  const [deleteTarget, setDeleteTarget] = useState<TransactionFilterSaved | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDelete(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, onDelete])

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
        <Loader2 size={16} className="animate-spin" />
        Ładowanie filtrów…
      </div>
    )
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
        Brak zapisanych filtrów. Skonfiguruj kryteria i użyj „Zapisz filtr”.
      </p>
    )
  }

  return (
    <>
      {error && <FormError message={error} />}
      <ul className="space-y-2">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <li key={item.id}>
              <div
                className={[
                  'flex items-stretch rounded-lg border overflow-hidden',
                  isActive
                    ? 'border-[#c9a96e] bg-[#c9a96e]/5'
                    : 'border-gray-200 dark:border-gray-800',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex-1 text-left px-3 py-2.5 min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(item.updatedAt).toLocaleDateString('pl-PL')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`Usuń filtr ${item.name}`}
                  className={[
                    btnSecondary,
                    'px-2 rounded-none border-0 border-l border-gray-200 dark:border-gray-800 text-gray-400 hover:text-red-500',
                  ].join(' ')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usuń filtr"
        message={
          deleteTarget
            ? `Czy na pewno usunąć filtr „${deleteTarget.name}"? Tej operacji nie można cofnąć.`
            : ''
        }
        confirmLabel="Usuń"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </>
  )
}

export function useTransactionFilterSavedList(
  refreshKey: number,
  loadList: () => Promise<TransactionFilterSaved[]>,
) {
  const [items, setItems] = useState<TransactionFilterSaved[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void loadList()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Nie udało się załadować filtrów.')
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadList, refreshKey])

  return { items, loading, error }
}
