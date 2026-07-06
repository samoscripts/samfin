import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, FileText, X, Maximize2, Minimize2 } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import { deleteTransaction, fetchTransaction } from '@/shared/api/transactions'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import SidePanelShell from '@/shared/components/panel/SidePanelShell'
import { useSidePanelWidth } from '@/shared/hooks/useSidePanelWidth'
import { PANEL_WIDTH_STORAGE_KEY } from '../constants/panelLayout'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import TransactionDetailsPanel from '../components/TransactionDetailsPanel'
import TransactionEditForm from '../components/TransactionEditForm'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties, fetchPartiesForClassificationRules } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/parties/types'
import { canCreateRuleFromTransaction } from '@/domains/home/configuration/classification-rules/utils/ruleFromTransaction'
import {
  clearTransactionPanelParams,
  mergeTransactionPanelParams,
  parseTransactionPanelParams,
  type TransactionPanelTab,
} from './transactionPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

export interface UseTransactionPanelOptions {
  onMutated?: () => void
}

export function useTransactionPanel({ onMutated }: UseTransactionPanelOptions = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const isMobile = useIsMobile()

  const { tx: urlTxId, tab: urlTab } = parseTransactionPanelParams(searchParams)
  const panelOpen = urlTxId !== null

  const {
    effectivePanelWidth,
    panelExpanded,
    toggleExpand,
    onWidthChange,
  } = useSidePanelWidth({ storageKey: PANEL_WIDTH_STORAGE_KEY })

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

  const activeTab: TransactionPanelTab = isEditing
    ? 'edit'
    : (urlTab ?? 'details')

  const applyPanelUrl = useCallback(
    (patch: { tx?: number | null; tab?: TransactionPanelTab | null }, replace = true) => {
      const next = mergeTransactionPanelParams(searchParams, patch)
      if (searchParamsEqual(searchParams, next)) return
      setSearchParams(next, { replace })
    },
    [searchParams, setSearchParams],
  )

  const openTx = useCallback(
    (txId: number, tab: TransactionPanelTab = 'details') => {
      applyPanelUrl({ tx: txId, tab })
    },
    [applyPanelUrl],
  )

  const openEdit = useCallback(
    (txId: number) => {
      applyPanelUrl({ tx: txId, tab: 'edit' })
    },
    [applyPanelUrl],
  )

  const closePanel = useCallback(() => {
    const next = clearTransactionPanelParams(searchParams)
    if (searchParamsEqual(searchParams, next)) return
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

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
    openEdit(selectedTx.transactionId)
    setIsEditing(true)
  }, [selectedTx, openEdit])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setIsDirty(false)
    if (urlTxId) {
      applyPanelUrl({ tx: urlTxId, tab: 'details' })
    }
  }, [urlTxId, applyPanelUrl])

  const handleSingleSaved = useCallback(
    (updated: Transaction) => {
      setSelectedTx(updated)
      setIsEditing(false)
      setIsDirty(false)
      applyPanelUrl({ tx: updated.transactionId, tab: 'details' })
      onMutated?.()
    },
    [applyPanelUrl, onMutated],
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
      closePanel()
      onMutated?.()
    } catch {
      // errors surfaced by API layer if needed
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, closePanel, onMutated])

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

  const handleClose = useCallback(() => {
    if (isEditing) {
      requestCancelEdit()
      return
    }
    closePanel()
  }, [isEditing, requestCancelEdit, closePanel])

  const tabBar = (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
      {!isEditing && selectedTx && (
        <button
          type="button"
          onClick={() => applyPanelUrl({ tx: selectedTx.transactionId, tab: 'details' })}
          className={[
            'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
            activeTab === 'details'
              ? 'border-[#c9a96e] text-[#c9a96e]'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          ].join(' ')}
        >
          <FileText size={13} />
          Szczegóły
        </button>
      )}

      {isEditing && (
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 border-[#c9a96e] text-[#c9a96e] -mb-px"
        >
          <Pencil size={13} />
          Edycja
        </button>
      )}

      {!isMobile && (
        <button
          type="button"
          onClick={toggleExpand}
          className="ml-auto p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={panelExpanded ? 'Zwiń panel' : 'Rozszerz panel'}
          title={panelExpanded ? 'Zwiń panel' : 'Rozszerz panel'}
        >
          {panelExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      <button
        type="button"
        onClick={handleClose}
        className={['p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors', isMobile ? 'ml-auto mr-3' : 'mr-3'].join(' ')}
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const panelContent = (
    <div className="flex flex-col h-full min-h-0">
      {tabBar}
      <div className="flex flex-col flex-1 min-h-0">
        {activeTab === 'edit' && selectedTx ? (
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <FileText size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ładowanie transakcji…</p>
          </div>
        )}
      </div>
    </div>
  )

  const transactionPanelPortal =
    portalRoot && panelOpen
      ? createPortal(
          <SidePanelShell
            key={urlTxId ?? 'closed'}
            open={panelOpen}
            width={effectivePanelWidth}
            resizable={!panelExpanded}
            onWidthChange={onWidthChange}
            onClose={handleClose}
            backdrop={
              isEditing
                ? { onClick: requestCancelEdit, desktopInset: true }
                : null
            }
          >
            {panelContent}
          </SidePanelShell>,
          portalRoot,
        )
      : null

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
    openTx,
    openEdit,
    closePanel,
    panelOpen,
    transactionPanelPortal,
    confirmDialogs,
  }
}
