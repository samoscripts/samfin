import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import { deleteTransaction, fetchTransaction } from '@/shared/api/transactions'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import TransactionDetailsPanel from '../components/TransactionDetailsPanel'
import TransactionEditForm from '../components/TransactionEditForm'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties, fetchPartiesForClassificationRules } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/general/parties/types'
import { canCreateRuleFromTransaction } from '@/domains/home/configuration/rules/utils/ruleFromTransaction'
import type { TransactionPanelTab } from './transactionPanelUrl'

export interface UseTransactionPanelStateOptions {
  urlTxId: number | null
  urlTab: TransactionPanelTab | null
  onApplyUrl: (patch: { tx?: number | null; tab?: TransactionPanelTab | null }) => void
  onClose: () => void
  onMutated?: () => void
}

export function useTransactionPanelState({
  urlTxId,
  urlTab,
  onApplyUrl,
  onClose,
  onMutated,
}: UseTransactionPanelStateOptions) {
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [editConfirm, setEditConfirm] = useState<'save' | 'cancel' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [ruleContextParties, setRuleContextParties] = useState<Party[]>([])

  const activeTab: TransactionPanelTab = isEditing ? 'edit' : (urlTab ?? 'details')
  const hasTransaction = urlTxId !== null

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => {})
    fetchConcerns().then(setConcerns).catch(() => {})
    fetchCategories().then(setCategories).catch(() => {})
    fetchParties().then(setParties).catch(() => {})
    fetchPartiesForClassificationRules().then(setRuleContextParties).catch(() => {})
  }, [])

  useEffect(() => {
    if (urlTab === 'edit' && urlTxId) {
      setIsEditing(true)
      return
    }
    if (urlTab === 'details' || urlTab === null) {
      setIsEditing(false)
    }
  }, [urlTab, urlTxId])

  useEffect(() => {
    if (!urlTxId) {
      setSelectedTx(null)
      return
    }

    let cancelled = false
    fetchTransaction(urlTxId)
      .then((tx) => {
        if (!cancelled) setSelectedTx(tx)
      })
      .catch(() => {
        if (!cancelled) setSelectedTx(null)
      })

    return () => {
      cancelled = true
    }
  }, [urlTxId])

  const handlePartyCreated = useCallback(async () => {
    setParties(await fetchParties())
  }, [])

  const handleCategoryCreated = useCallback(async () => {
    setCategories(await fetchCategories())
  }, [])

  const handleStartEdit = useCallback(() => {
    if (!selectedTx) return
    onApplyUrl({ tx: selectedTx.transactionId, tab: 'edit' })
    setIsEditing(true)
  }, [selectedTx, onApplyUrl])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setIsDirty(false)
    if (urlTxId) {
      onApplyUrl({ tx: urlTxId, tab: 'details' })
    }
  }, [urlTxId, onApplyUrl])

  const handleSingleSaved = useCallback(
    (updated: Transaction) => {
      setSelectedTx(updated)
      setIsEditing(false)
      setIsDirty(false)
      onApplyUrl({ tx: updated.transactionId, tab: 'details' })
      onMutated?.()
    },
    [onApplyUrl, onMutated],
  )

  const handleRestored = useCallback(
    (updated: Transaction) => {
      setSelectedTx(updated)
      onMutated?.()
    },
    [onMutated],
  )

  const handleRequestDelete = useCallback((tx: Transaction) => {
    setDeleteTarget(tx)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTransaction(deleteTarget.transactionId)
      setDeleteTarget(null)
      setSelectedTx(null)
      onClose()
      onMutated?.()
    } catch {
      // errors surfaced by API layer if needed
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, onClose, onMutated])

  const handleCreateRule = useCallback(
    (tx: Transaction) => {
      const params = new URLSearchParams({
        fromTx: String(tx.transactionId),
        returnUrl: location.pathname + location.search,
      })
      navigate(`/konfiguracja/reguly/nowy?${params.toString()}`)
    },
    [navigate, location],
  )

  const requestCancelEdit = useCallback(() => {
    if (isDirty) {
      setEditConfirm('cancel')
      return
    }
    handleCancelEdit()
  }, [isDirty, handleCancelEdit])

  const handleConfirmDialog = useCallback(async () => {
    if (editConfirm === 'cancel') {
      setEditConfirm(null)
      handleCancelEdit()
    }
  }, [editConfirm, handleCancelEdit])

  const transactionContent =
    activeTab === 'edit' && selectedTx ? (
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
        <TransactionEditForm
          key={selectedTx.transactionId}
          tx={selectedTx}
          wallets={wallets}
          concerns={concerns}
          categories={categories}
          parties={parties}
          onSaved={handleSingleSaved}
          onCancel={requestCancelEdit}
          onPartyCreated={handlePartyCreated}
          onCategoryCreated={handleCategoryCreated}
        />
      </div>
    ) : selectedTx ? (
      <div className="flex-1 overflow-y-auto min-h-0">
        <TransactionDetailsPanel
          tx={selectedTx}
          onEdit={handleStartEdit}
          onDelete={() => handleRequestDelete(selectedTx)}
          onRestored={handleRestored}
          onCreateRule={() => handleCreateRule(selectedTx)}
          canCreateRule={canCreateRuleFromTransaction(selectedTx, ruleContextParties)}
        />
      </div>
    ) : urlTxId ? (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
        <FileText size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ładowanie transakcji…</p>
      </div>
    ) : null

  const confirmDialogs = (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usuń transakcję"
        message="Czy na pewno chcesz usunąć tę transakcję?"
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={editConfirm === 'cancel'}
        title="Anulować edycję?"
        message="Niezapisane zmiany zostaną utracone."
        confirmLabel="Anuluj edycję"
        cancelLabel="Zostań"
        onConfirm={() => void handleConfirmDialog()}
        onCancel={() => setEditConfirm(null)}
      />
    </>
  )

  return {
    hasTransaction,
    isEditing,
    activeTab,
    selectedTx,
    transactionContent,
    confirmDialogs,
    requestCancelEdit,
  }
}
