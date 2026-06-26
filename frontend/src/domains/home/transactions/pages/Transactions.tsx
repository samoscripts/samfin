import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown, PanelRight, ArrowRight, Plus } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'
import Pill from '@/shared/components/Pill'
import Pagination from '@/shared/components/Pagination'
import { DIRECTION_PILL, STATUS_PILL } from '@/shared/constants/pillMaps'
import { DIRECTION_LABEL_BY_VALUE, STATUS_LABEL_BY_VALUE } from '../constants/labels'
import FilterChips from '../components/FilterChips'
import { ItemAmounts, ItemField } from '../components/TransactionCells'
import TransactionsSidebar from '../components/TransactionsSidebar'
import type { EditMode, SidebarTab } from '../components/TransactionsSidebar'
import {
  clampIndex,
  getSelectedTransactions,
  hasMixedDirections,
  selectRange,
  toggleBulkSelection,
  toggleIdInSet,
} from '../utils/bulkSelection'
import { useFlowsQuery } from '../hooks/useFlowsQuery'
import { useTransactionListUrl } from '../hooks/useTransactionListUrl'
import { isPanelOpenFromUrl } from '../utils/transactionUrlParams'
import {
  computeExpandedPanelWidth,
  loadStoredPanelWidth,
  storePanelWidth,
} from '../constants/panelLayout'
import { FlowFilters, SortState, countActiveFilters } from '../types'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { Transaction } from '@/shared/types'
import { formatDate } from '@/shared/utils/format'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import TransactionOperationText from '../components/TransactionOperationText'
import ApplyClassificationRulesDialog from '../components/ApplyClassificationRulesDialog'
import { applyClassificationRules, deleteTransaction, fetchTransaction } from '@/shared/api/transactions'
import { getApiErrorMessage } from '@/shared/utils/errors'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { flowFiltersToTransactionFilters } from '../utils/flowFilters'

type SortableCol = 'date' | 'amount'

const COLUMNS: { key: string; label: string; sortable?: SortableCol }[] = [
  { key: 'date',        label: 'Data',      sortable: 'date' },
  { key: 'direction',   label: 'Typ' },
  { key: 'paidFrom',    label: 'Skąd' },
  { key: 'paidTo',      label: 'Dokąd' },
  { key: 'description', label: 'Opis' },
  { key: 'wallet',      label: 'Portfel' },
  { key: 'concern',     label: 'Dotyczy' },
  { key: 'category',    label: 'Kategoria' },
  { key: 'amount',      label: 'Kwota',    sortable: 'amount' },
  { key: 'status',      label: 'Status' },
]

export default function Transactions() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    filters: activeFilters,
    sort,
    pagination,
    tx: urlTxId,
    tab: urlTab,
    createPrefill,
    applyUrl,
    setSort,
    setPagination,
    openTx,
    openFiltersTab,
    openEdit,
    openCreate,
    exitEditMode,
    setTab,
    openBulkDetails,
    closePanel,
  } = useTransactionListUrl()

  const [panelWidth, setPanelWidth] = useState(loadStoredPanelWidth)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const effectivePanelWidth = panelExpanded ? computeExpandedPanelWidth() : panelWidth
  const [refreshKey, setRefreshKey]       = useState(0)

  const [selectedTx, setSelectedTx]       = useState<Transaction | null>(null)
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set())
  const [focusIndex, setFocusIndex]       = useState(-1)
  const [selectionAnchor, setSelectionAnchor] = useState(-1)
  const [editMode, setEditMode]           = useState<EditMode>(null)
  const isEditing = editMode !== null
  const [isDirty, setIsDirty]             = useState(false)
  const [editConfirm, setEditConfirm]     = useState<'save' | 'cancel' | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Transaction | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [applyRulesOpen, setApplyRulesOpen] = useState(false)
  const [applyRulesMode, setApplyRulesMode] = useState<'selection' | 'filter' | null>(null)
  const [applyRulesLoading, setApplyRulesLoading] = useState(false)
  const [applyRulesMessage, setApplyRulesMessage] = useState<string | null>(null)
  const [filterCategories, setFilterCategories] = useState<Category[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  const saveFnRef = useRef<(() => Promise<void>) | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])
  const portalRoot = useRightPanelPortal()

  const { data, isLoading, isRefreshing, meta } = useFlowsQuery(activeFilters, sort, pagination, refreshKey)

  const panelOpen = isPanelOpenFromUrl({ filters: activeFilters, sort, pagination, tx: urlTxId, tab: urlTab, createPrefill }) || isEditing
  const activeTab: SidebarTab = isEditing
    ? (editMode === 'create' ? 'create' : 'edit')
    : (urlTab ?? (urlTxId ? 'details' : 'filters'))

  const bulkTransactions = useMemo(
    () => getSelectedTransactions(data, selectedIds),
    [data, selectedIds],
  )
  const selectionMixed = bulkTransactions.length > 1 && hasMixedDirections(bulkTransactions)

  useEffect(() => {
    fetchCategories().then(setFilterCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (urlTab === 'create') {
      setEditMode('create')
      return
    }
    if (urlTab === 'edit' && urlTxId) {
      setEditMode((prev) => (prev === 'bulk' ? 'bulk' : 'single'))
      return
    }
    if (urlTab === 'edit' && !urlTxId && bulkTransactions.length > 1 && !selectionMixed) {
      setEditMode('bulk')
      return
    }
    if (urlTab === 'filters' || urlTab === 'details' || urlTab === null) {
      if (editMode !== 'bulk') {
        setEditMode(null)
      }
      return
    }
  }, [urlTab, urlTxId, editMode, bulkTransactions.length, selectionMixed])

  const handlePanelWidthChange = useCallback((w: number) => {
    setPanelWidth(w)
    storePanelWidth(w)
  }, [])

  useEffect(() => {
    if (!urlTxId) {
      setSelectedTx(null)
      return
    }

    const inList = data.find((t) => t.transactionId === urlTxId)
    if (inList) {
      setSelectedTx(inList)
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
  }, [urlTxId, data])

  useEffect(() => {
    setSelectedIds(new Set())
    setFocusIndex(-1)
    setSelectionAnchor(-1)
    setSelectionMode(false)
  }, [pagination.page, pagination.perPage])

  const currentSelectionId = selectedTx?.transactionId ?? urlTxId ?? null

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    closePanel()
  }, [closePanel])

  useEffect(() => {
    if (focusIndex < 0) return
    rowRefs.current[focusIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex])

  const handleApplyFilters = useCallback(
    (filters: FlowFilters, options?: { closePanel?: boolean }) => {
      applyUrl({
        filters,
        pagination: { ...pagination, page: 1 },
        ...(options?.closePanel ? { tx: null, tab: null, createPrefill: {} } : {}),
      })
      setRefreshKey((k) => k + 1)
    },
    [applyUrl, pagination],
  )

  const handleSortColumn = (field: SortableCol) => {
    setSort(
      sort.field === field
        ? { field, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' },
    )
  }

  const handleOpenFilters = useCallback(() => {
    if (isEditing) return
    openFiltersTab()
  }, [isEditing, openFiltersTab])

  const applyBulkSelection = useCallback(
    (ids: Set<number>, index: number) => {
      setSelectedTx(null)
      setFocusIndex(index)
      setSelectionAnchor(index)
      if (ids.size === 0) {
        setSelectedIds(new Set())
        openFiltersTab()
        return
      }
      setSelectedIds(ids)
      openBulkDetails()
    },
    [openBulkDetails, openFiltersTab],
  )

  const handleRowActivate = useCallback(
    (tx: Transaction, index: number, e?: React.MouseEvent) => {
      if (isEditing) return

      if (selectionMode) {
        const next = toggleIdInSet(selectedIds, tx.transactionId)
        if (next.size === 0) {
          exitSelectionMode()
          return
        }
        setSelectedIds(next)
        setFocusIndex(index)
        return
      }

      tableRef.current?.focus()

      if (e?.shiftKey) {
        const anchor = selectionAnchor >= 0 ? selectionAnchor : index
        if (selectionAnchor < 0) setSelectionAnchor(index)
        applyBulkSelection(selectRange(data, anchor, index), index)
        return
      }

      if (e?.ctrlKey || e?.metaKey) {
        const next = toggleBulkSelection(selectedIds, tx.transactionId, currentSelectionId)
        applyBulkSelection(next, index)
        return
      }

      setSelectionMode(false)
      setSelectedIds(new Set())
      setFocusIndex(index)
      setSelectionAnchor(index)
      openTx(tx.transactionId, 'details')
    },
    [
      isEditing,
      selectionMode,
      selectedIds,
      selectionAnchor,
      data,
      currentSelectionId,
      applyBulkSelection,
      exitSelectionMode,
      openTx,
    ],
  )

  const handleMobileLongPress = useCallback(
    (tx: Transaction, index: number) => {
      if (isEditing) return

      const ids = new Set<number>()
      if (currentSelectionId != null) ids.add(currentSelectionId)
      ids.add(tx.transactionId)

      setSelectionMode(true)
      setSelectedTx(null)
      setSelectedIds(ids)
      setFocusIndex(index)
      setSelectionAnchor(index)
      closePanel()
      navigator.vibrate?.(10)
    },
    [isEditing, currentSelectionId, closePanel],
  )

  const handleArrowNavigate = useCallback(
    (delta: number, extend: boolean) => {
      if (isEditing || data.length === 0) return

      tableRef.current?.focus()

      let next: number
      if (focusIndex < 0) {
        next = delta > 0 ? 0 : data.length - 1
      } else {
        next = clampIndex(focusIndex + delta, data.length)
        if (next === focusIndex) return
      }
      const current = focusIndex < 0 ? next : focusIndex

      if (extend) {
        const anchor = selectionAnchor < 0 ? current : selectionAnchor
        applyBulkSelection(selectRange(data, anchor, next), next)
        if (selectionAnchor < 0) setSelectionAnchor(current)
        return
      }

      setFocusIndex(next)
      setSelectionAnchor(next)
      setSelectedIds(new Set())
      openTx(data[next].transactionId, 'details')
    },
    [data, isEditing, focusIndex, selectionAnchor, applyBulkSelection, openTx],
  )

  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing || data.length === 0) return

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleArrowNavigate(-1, e.shiftKey)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleArrowNavigate(1, e.shiftKey)
      }
    },
    [data.length, isEditing, handleArrowNavigate],
  )

  const handleStartEdit = useCallback(() => {
    if (bulkTransactions.length > 1) {
      if (selectionMixed) return
      setEditMode('bulk')
      setTab('edit')
      return
    }
    const tx = bulkTransactions[0] ?? selectedTx
    if (tx) {
      openEdit(tx.transactionId)
      setEditMode('single')
    }
  }, [bulkTransactions, selectedTx, selectionMixed, openEdit, setTab])

  const handleCancelEdit = useCallback(() => {
    setEditMode(null)
    const returnTxId =
      editMode === 'create'
        ? null
        : (selectedTx?.transactionId ?? urlTxId ?? null)
    exitEditMode(returnTxId)
    setIsDirty(false)
  }, [selectedTx, urlTxId, editMode, exitEditMode])

  const handleBulkSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setSelectedIds(new Set())
    setSelectionMode(false)
    setEditMode(null)
    exitEditMode(selectedTx?.transactionId ?? urlTxId ?? null)
    setIsDirty(false)
  }, [selectedTx, urlTxId, exitEditMode])

  const handleSingleSaved = useCallback(
    (updated: Transaction) => {
      setRefreshKey((k) => k + 1)
      setSelectedTx(updated)
      setEditMode(null)
      exitEditMode(updated.transactionId)
      setIsDirty(false)
    },
    [exitEditMode],
  )

  const handleCreated = useCallback(
    (tx: Transaction) => {
      setRefreshKey((k) => k + 1)
      setEditMode(null)
      openTx(tx.transactionId, 'details')
      setIsDirty(false)
    },
    [openTx],
  )

  const handleRestored = useCallback((updated: Transaction) => {
    setRefreshKey((k) => k + 1)
    setSelectedTx(updated)
  }, [])

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
      setSelectedIds(new Set())
      setRefreshKey((k) => k + 1)
      closePanel()
    } catch (err: unknown) {
      setApplyRulesMessage(getApiErrorMessage(err, 'Nie udało się usunąć transakcji.'))
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, closePanel])

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

  const requestSaveEdit = useCallback(() => {
    setEditConfirm('save')
  }, [])

  const requestCancelEdit = useCallback(() => {
    if (isDirty) {
      setEditConfirm('cancel')
      return
    }
    handleCancelEdit()
  }, [isDirty, handleCancelEdit])

  const handleRegisterSave = useCallback((fn: () => Promise<void>) => {
    saveFnRef.current = fn
  }, [])

  const handleConfirmDialog = useCallback(async () => {
    if (editConfirm === 'save') {
      setConfirmLoading(true)
      try {
        await saveFnRef.current?.()
        setEditConfirm(null)
      } catch {
        // błąd walidacji/zapisu — dialog zostaje otwarty
      } finally {
        setConfirmLoading(false)
      }
      return
    }

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

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      if (isEditing) return
      setTab(tab)
    },
    [isEditing, setTab],
  )

  const openApplyRulesSelection = useCallback(() => {
    if (bulkTransactions.length === 0) return
    setApplyRulesMode('selection')
    setApplyRulesOpen(true)
  }, [bulkTransactions.length])

  const openApplyRulesFilter = useCallback(() => {
    setApplyRulesMode('filter')
    setApplyRulesOpen(true)
  }, [])

  const handleConfirmApplyRules = useCallback(
    async (overwrite: boolean) => {
      setApplyRulesLoading(true)
      setApplyRulesMessage(null)
      try {
        const result =
          applyRulesMode === 'filter'
            ? await applyClassificationRules({
                filters: flowFiltersToTransactionFilters(activeFilters),
                overwrite,
              })
            : await applyClassificationRules({
                transactionIds: bulkTransactions.map((t) => t.transactionId),
                overwrite,
              })

        const errCount = Object.keys(result.errors).length
        setApplyRulesMessage(
          `Zastosowano: ${result.applied}, pominięto: ${result.skipped}, brak kontekstu podmiotu: ${result.noPartyContext}` +
            (errCount > 0 ? `, błędy: ${errCount}` : ''),
        )
        setApplyRulesOpen(false)
        setRefreshKey((k) => k + 1)
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Nie udało się zastosować reguł.'
        setApplyRulesMessage(msg)
      } finally {
        setApplyRulesLoading(false)
      }
    },
    [applyRulesMode, activeFilters, bulkTransactions],
  )

  const activeCount = countActiveFilters(activeFilters)

  const handleOpenCreate = useCallback(() => {
    setEditMode('create')
    openCreate()
  }, [openCreate])

  const filtryButton = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleOpenCreate()}
        disabled={isEditing}
        aria-label="Nowa transakcja"
        className={[
          'inline-flex items-center justify-center gap-2 px-2.5 py-2 md:px-4 text-sm font-medium rounded-lg text-white hover:opacity-90 transition-opacity',
          isEditing ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        style={{ backgroundColor: '#1c4230' }}
      >
        <Plus size={15} />
        <span className="hidden md:inline">Nowa transakcja</span>
      </button>
      <button
        type="button"
        onClick={handleOpenFilters}
        disabled={isEditing}
        className={[
          'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm',
          panelOpen && activeTab === 'filters'
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
          isEditing ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        aria-label="Pokaż filtry"
      >
        <PanelRight size={15} />
        Filtry
        {activeCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ backgroundColor: '#c9a96e' }}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  )

  const saveConfirmMessage = `Zostanie zaktualizowanych ${bulkTransactions.length} transakcji. Kontynuować?`

  const cancelConfirmMessage = isDirty
    ? 'Niezapisane zmiany zostaną utracone. Wrócisz do poprzedniego widoku listy.'
    : 'Wrócisz do poprzedniego widoku listy.'

  return (
    <>
      <div className="flex flex-col md:h-full md:overflow-hidden">
        <div className="px-4 md:px-6 pt-6 pb-0 shrink-0">
          <PageHeader
            title="Przelewy / Transakcje"
            subtitle="Lista wszystkich transakcji finansowych"
            actions={filtryButton}
          />
        </div>

        {activeCount > 0 && (
          <div className="px-4 md:px-6 pb-2 pt-3 shrink-0">
            <FilterChips filters={activeFilters} categories={filterCategories} onChange={handleApplyFilters} />
          </div>
        )}

        {applyRulesMessage && (
          <div className="px-4 md:px-6 pb-2 shrink-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
              {applyRulesMessage}
            </p>
          </div>
        )}

        {/* Mobile: card list */}
        <div className="md:hidden px-4 pb-6 pt-3">
          {selectionMode && !isLoading && data.length > 0 && (
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Anuluj
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Zaznaczono: {bulkTransactions.length}
              </span>
              <button
                type="button"
                onClick={openBulkDetails}
                disabled={bulkTransactions.length === 0}
                className="text-sm font-medium text-[#8a7340] dark:text-[#c9a96e] hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Szczegóły
              </button>
            </div>
          )}
          {isLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Ładowanie…</div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wyników</p>
              {activeCount > 0 && (
                <button
                  onClick={() => handleApplyFilters({})}
                  className="mt-2 text-xs text-[#c9a96e] hover:underline"
                >
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((tx, index) => (
                <TransactionCard
                  key={tx.transactionId}
                  tx={tx}
                  bulkSelected={selectedIds.has(tx.transactionId)}
                  selected={selectedTx?.transactionId === tx.transactionId && selectedIds.size === 0}
                  selectionMode={selectionMode}
                  onActivate={(e) => handleRowActivate(tx, index, e)}
                  onLongPress={() => handleMobileLongPress(tx, index)}
                  selectionBlocked={isEditing}
                />
              ))}
            </div>
          )}
          <div className="mt-4">
            <Pagination meta={meta} state={pagination} onChange={setPagination} />
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:flex flex-1 min-h-0 px-6 pb-6 pt-3">
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-gray-400 dark:text-gray-600">
                Ładowanie…
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wyników</p>
                {activeCount > 0 && (
                  <button
                    onClick={() => handleApplyFilters({})}
                    className="mt-2 text-xs text-[#c9a96e] hover:underline"
                  >
                    Wyczyść filtry
                  </button>
                )}
              </div>
            ) : (
              <div
                ref={tableRef}
                tabIndex={0}
                onKeyDown={handleTableKeyDown}
                className={[
                  'flex-1 overflow-auto outline-none transition-opacity',
                  isRefreshing ? 'opacity-60' : '',
                ].join(' ')}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          onClick={col.sortable ? () => handleSortColumn(col.sortable!) : undefined}
                          className={[
                            'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap',
                            col.sortable
                              ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none'
                              : '',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && <SortIcon field={col.sortable} sort={sort} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {data.map((tx, index) => {
                      const isDetailSelected =
                        selectedIds.size === 0 && selectedTx?.transactionId === tx.transactionId
                      const isBulkSelected = selectedIds.has(tx.transactionId)
                      const isRowSelected = isBulkSelected || isDetailSelected
                      return (
                        <tr
                          key={tx.transactionId}
                          ref={(el) => {
                            rowRefs.current[index] = el
                          }}
                          onClick={(e) => handleRowActivate(tx, index, e)}
                          className={[
                            'transition-colors',
                            isEditing ? 'cursor-not-allowed' : 'cursor-pointer',
                            isRowSelected
                              ? 'bg-amber-50/80 dark:bg-amber-950/20'
                              : isEditing
                                ? ''
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                            {tx.transDate}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Pill variant={DIRECTION_PILL[tx.direction]}>
                              {DIRECTION_LABEL_BY_VALUE[tx.direction]}
                            </Pill>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {tx.paidFrom ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {tx.paidTo ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[220px]">
                            <TransactionOperationText tx={tx} />
                          </td>
                          <td className="px-4 py-3">
                            <ItemField items={tx.items} field="wallet" />
                          </td>
                          <td className="px-4 py-3">
                            <ItemField items={tx.items} field="concern" />
                          </td>
                          <td className="px-4 py-3">
                            <ItemField items={tx.items} field="category" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <ItemAmounts tx={tx} />
                          </td>
                          <td className="px-4 py-3">
                            <Pill variant={STATUS_PILL[tx.status]}>
                              {STATUS_LABEL_BY_VALUE[tx.status]}
                            </Pill>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination meta={meta} state={pagination} onChange={setPagination} />
          </div>
        </div>
      </div>

      {portalRoot &&
        createPortal(
          <TransactionsSidebar
            open={panelOpen}
            width={effectivePanelWidth}
            expanded={panelExpanded}
            resizable={!panelExpanded}
            onWidthChange={handlePanelWidthChange}
            onToggleExpand={() => setPanelExpanded((v) => !v)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            activeFilters={activeFilters}
            onApply={handleApplyFilters}
            selectedTx={selectedTx}
            selectionMixed={selectionMixed}
            editMode={editMode}
            bulkTransactions={bulkTransactions}
            isEditing={isEditing}
            createPrefill={createPrefill}
            onStartEdit={handleStartEdit}
            onBulkSaved={handleBulkSaved}
            onSingleSaved={handleSingleSaved}
            onCreated={handleCreated}
            onRestored={handleRestored}
            onDelete={handleRequestDelete}
            onSaveClick={requestSaveEdit}
            onCancelClick={requestCancelEdit}
            onRegisterSave={handleRegisterSave}
            onRequestCancelEdit={requestCancelEdit}
            onDirtyChange={setIsDirty}
            onClose={handleClose}
            onApplyRules={openApplyRulesSelection}
            onApplyRulesToFilter={openApplyRulesFilter}
            onCreateRule={handleCreateRule}
          />,
          portalRoot,
        )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usuń transakcję"
        message="Czy na pewno chcesz usunąć tę transakcję?"
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={editConfirm === 'save' && editMode === 'bulk'}
        title="Zapisać zmiany?"
        message={saveConfirmMessage}
        confirmLabel="Zapisz"
        cancelLabel="Anuluj"
        loading={confirmLoading}
        onConfirm={handleConfirmDialog}
        onCancel={() => setEditConfirm(null)}
      />

      <ConfirmDialog
        open={editConfirm === 'cancel'}
        title="Anulować edycję?"
        message={cancelConfirmMessage}
        confirmLabel="Anuluj edycję"
        cancelLabel="Zostań"
        onConfirm={handleConfirmDialog}
        onCancel={() => setEditConfirm(null)}
      />

      <ApplyClassificationRulesDialog
        open={applyRulesOpen}
        title={
          applyRulesMode === 'filter'
            ? 'Zastosuj reguły do filtra'
            : 'Zastosuj reguły do zaznaczenia'
        }
        message={
          applyRulesMode === 'filter'
            ? 'Reguły zostaną uruchomione dla wszystkich transakcji pasujących do aktywnych filtrów (maks. 10 000).'
            : `Reguły zostaną uruchomione dla ${bulkTransactions.length} zaznaczonych transakcji.`
        }
        loading={applyRulesLoading}
        onConfirm={handleConfirmApplyRules}
        onCancel={() => setApplyRulesOpen(false)}
      />
    </>
  )
}

function TransactionCard({
  tx,
  bulkSelected,
  selected,
  selectionMode,
  onActivate,
  onLongPress,
  selectionBlocked,
}: {
  tx: Transaction
  bulkSelected: boolean
  selected: boolean
  selectionMode: boolean
  onActivate: (e: React.MouseEvent) => void
  onLongPress: () => void
  selectionBlocked: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectionBlocked || selectionMode) return
    longPressTriggeredRef.current = false
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onLongPress()
    }, 500)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || !longPressTimerRef.current) return
    const dx = e.clientX - pointerStartRef.current.x
    const dy = e.clientY - pointerStartRef.current.y
    if (Math.hypot(dx, dy) > 10) clearLongPressTimer()
  }

  const handlePointerUp = () => {
    clearLongPressTimer()
    pointerStartRef.current = null
  }

  const handleClick = (e: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      e.preventDefault()
      return
    }
    onActivate(e)
  }

  const isHighlighted = bulkSelected || selected

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={[
        'bg-white dark:bg-gray-900 border rounded-xl p-4 transition-colors select-none',
        isHighlighted
          ? 'border-[#c9a96e]/60 bg-amber-50/40 dark:bg-amber-950/10'
          : 'border-gray-200 dark:border-gray-800',
        selectionBlocked ? 'cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <div
            className={[
              'shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors',
              bulkSelected
                ? 'bg-[#1c4230] border-[#1c4230] text-white'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
            ].join(' ')}
            aria-hidden
          >
            {bulkSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0 pt-0.5">
          {formatDate(tx.transDate)}
        </span>
        <ItemAmounts tx={tx} />
      </div>

      <div className="mt-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
        <TransactionOperationText tx={tx} lines={2} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate max-w-[120px]">{tx.paidFrom ?? '—'}</span>
        <ArrowRight size={10} className="shrink-0" />
        <span className="truncate max-w-[120px]">{tx.paidTo ?? '—'}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <Pill variant={DIRECTION_PILL[tx.direction]}>
          {DIRECTION_LABEL_BY_VALUE[tx.direction]}
        </Pill>
        <Pill variant={STATUS_PILL[tx.status]}>
          {STATUS_LABEL_BY_VALUE[tx.status]}
        </Pill>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="ml-auto text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {expanded ? 'Mniej' : 'Więcej'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <ItemField items={tx.items} field="wallet" />
          <ItemField items={tx.items} field="concern" />
          <ItemField items={tx.items} field="category" />
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

function SortIcon({ field, sort }: { field: SortableCol; sort: SortState }) {
  if (sort.field !== field) return <ArrowUpDown size={10} className="text-gray-300 dark:text-gray-600" />
  return sort.direction === 'asc' ? (
    <ArrowUp size={10} className="text-[#c9a96e]" />
  ) : (
    <ArrowDown size={10} className="text-[#c9a96e]" />
  )
}
