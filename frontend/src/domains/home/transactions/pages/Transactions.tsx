import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown, PanelRight, ArrowRight } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'
import StatusBadge from '@/shared/components/StatusBadge'
import Pagination from '@/shared/components/Pagination'
import FilterChips from '../components/FilterChips'
import { ItemAmounts, ItemField } from '../components/TransactionCells'
import TransactionsSidebar from '../components/TransactionsSidebar'
import type { EditMode, SidebarTab } from '../components/TransactionsSidebar'
import {
  clampIndex,
  getSelectedTransactions,
  hasMixedDirections,
  selectRange,
  toggleIdInSet,
} from '../utils/bulkSelection'
import { useFlowsQuery } from '../hooks/useFlowsQuery'
import { FlowFilters, SortState, PaginationState, countActiveFilters } from '../types'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { Transaction } from '@/shared/types'
import { formatDate } from '@/shared/utils/format'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import ApplyClassificationRulesDialog from '../components/ApplyClassificationRulesDialog'
import { applyClassificationRules } from '@/shared/api/transactions'
import { flowFiltersToTransactionFilters } from '../utils/flowFilters'

const INITIAL_SORT: SortState = { field: 'date', direction: 'desc' }
const INITIAL_PAGINATION: PaginationState = { page: 1, perPage: 25 }

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
  const [activeFilters, setActiveFilters] = useState<FlowFilters>({})
  const [sort, setSort]                   = useState<SortState>(INITIAL_SORT)
  const [pagination, setPagination]       = useState<PaginationState>(INITIAL_PAGINATION)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [panelWidth, setPanelWidth]       = useState(360)
  const [activeTab, setActiveTab]         = useState<SidebarTab>('filters')
  const [refreshKey, setRefreshKey]       = useState(0)

  const [selectedTx, setSelectedTx]       = useState<Transaction | null>(null)
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set())
  const [focusIndex, setFocusIndex]       = useState(-1)
  const [selectionAnchor, setSelectionAnchor] = useState(-1)
  const [editMode, setEditMode]           = useState<EditMode>(null)
  const [editTabOpen, setEditTabOpen]     = useState(false)
  const [isDirty, setIsDirty]             = useState(false)
  const [editConfirm, setEditConfirm]     = useState<'save' | 'cancel' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [applyRulesOpen, setApplyRulesOpen] = useState(false)
  const [applyRulesMode, setApplyRulesMode] = useState<'selection' | 'filter' | null>(null)
  const [applyRulesLoading, setApplyRulesLoading] = useState(false)
  const [applyRulesMessage, setApplyRulesMessage] = useState<string | null>(null)

  const saveFnRef = useRef<(() => Promise<void>) | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])
  const portalRoot = useRightPanelPortal()

  const { data, isLoading, meta } = useFlowsQuery(activeFilters, sort, pagination, refreshKey)

  const bulkTransactions = useMemo(
    () => getSelectedTransactions(data, selectedIds),
    [data, selectedIds],
  )
  const selectionMixed = bulkTransactions.length > 1 && hasMixedDirections(bulkTransactions)

  useEffect(() => {
    const selectedTxId = (location.state as { selectedTxId?: number } | null)?.selectedTxId
    if (!selectedTxId || data.length === 0) return
    const tx = data.find((t) => t.transactionId === selectedTxId)
    if (tx) {
      setSelectedTx(tx)
      setPanelOpen(true)
      setActiveTab('details')
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [data, location.pathname, location.state, navigate])

  useEffect(() => {
    setSelectedIds(new Set())
    setFocusIndex(-1)
    setSelectionAnchor(-1)
  }, [pagination.page, pagination.perPage])

  useEffect(() => {
    if (focusIndex < 0) return
    rowRefs.current[focusIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex])

  const handleApplyFilters = useCallback((filters: FlowFilters) => {
    setActiveFilters(filters)
    setPagination((p) => ({ ...p, page: 1 }))
  }, [])

  const handleSortColumn = (field: SortableCol) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' },
    )
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const handleOpenFilters = useCallback(() => {
    if (editTabOpen) return
    setActiveTab('filters')
    setPanelOpen(true)
  }, [editTabOpen])

  const handleRowActivate = useCallback(
    (tx: Transaction, index: number, e?: React.MouseEvent) => {
      if (editTabOpen) return

      tableRef.current?.focus()

      if (e?.ctrlKey || e?.metaKey) {
        setSelectedIds((prev) => toggleIdInSet(prev, tx.transactionId))
        setSelectedTx(null)
        setFocusIndex(index)
        setSelectionAnchor(index)
        setPanelOpen(true)
        setActiveTab('details')
        return
      }

      setSelectedIds(new Set())
      setSelectedTx(tx)
      setFocusIndex(index)
      setSelectionAnchor(index)
      setPanelOpen(true)
      setActiveTab('details')
    },
    [editTabOpen],
  )

  const handleArrowNavigate = useCallback(
    (delta: number, extend: boolean) => {
      if (editTabOpen || data.length === 0) return

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
        setSelectedIds(selectRange(data, anchor, next))
        setSelectedTx(null)
        setFocusIndex(next)
        if (selectionAnchor < 0) setSelectionAnchor(current)
        setPanelOpen(true)
        setActiveTab('details')
        return
      }

      setFocusIndex(next)
      setSelectionAnchor(next)
      setSelectedIds(new Set())
      setSelectedTx(data[next])
      setPanelOpen(true)
      setActiveTab('details')
    },
    [data, editTabOpen, focusIndex, selectionAnchor],
  )

  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editTabOpen || data.length === 0) return

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleArrowNavigate(-1, e.shiftKey)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleArrowNavigate(1, e.shiftKey)
      }
    },
    [data.length, editTabOpen, handleArrowNavigate],
  )

  const handleStartEdit = useCallback(() => {
    if (bulkTransactions.length > 1) {
      if (selectionMixed) return
      setEditMode('bulk')
      setEditTabOpen(true)
      setActiveTab('edit')
      return
    }
    const tx = bulkTransactions[0] ?? selectedTx
    if (tx) {
      navigate(`/transactions/${tx.transactionId}/edit`)
    }
  }, [bulkTransactions, selectedTx, selectionMixed, navigate])

  const handleCancelEdit = useCallback(() => {
    setEditTabOpen(false)
    setEditMode(null)
    setActiveTab(selectedTx || bulkTransactions.length > 0 ? 'details' : 'filters')
    setIsDirty(false)
  }, [selectedTx, bulkTransactions.length])

  const handleBulkSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setSelectedIds(new Set())
    setEditTabOpen(false)
    setEditMode(null)
    setActiveTab(selectedTx ? 'details' : 'filters')
    setIsDirty(false)
  }, [selectedTx])

  const handleRestored = useCallback((updated: Transaction) => {
    setRefreshKey((k) => k + 1)
    setSelectedTx(updated)
  }, [])

  const requestSaveEdit = useCallback(() => {
    setEditConfirm('save')
  }, [])

  const requestCancelEdit = useCallback(() => {
    setEditConfirm('cancel')
  }, [])

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
    if (editTabOpen) {
      requestCancelEdit()
      return
    }
    setPanelOpen(false)
  }, [editTabOpen, requestCancelEdit])

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      if (editTabOpen) return
      setActiveTab(tab)
    },
    [editTabOpen],
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

  const filtryButton = (
    <button
      onClick={handleOpenFilters}
      disabled={editTabOpen}
      className={[
        'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm',
        panelOpen && activeTab === 'filters'
          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
        editTabOpen ? 'opacity-50 cursor-not-allowed' : '',
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
  )

  const saveConfirmMessage = `Zostanie zaktualizowanych ${bulkTransactions.length} transakcji. Kontynuować?`

  const cancelConfirmMessage = isDirty
    ? 'Niezapisane zmiany zostaną utracone. Wrócisz do listy transakcji.'
    : 'Wrócisz do listy transakcji bez zapisywania.'

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
            <FilterChips filters={activeFilters} onChange={handleApplyFilters} />
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
                  selected={selectedTx?.transactionId === tx.transactionId}
                  onActivate={(e) => handleRowActivate(tx, index, e)}
                  selectionBlocked={editTabOpen}
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
                className="flex-1 overflow-auto outline-none"
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
                      const isDetailSelected = selectedTx?.transactionId === tx.transactionId
                      const isBulkSelected = selectedIds.has(tx.transactionId)
                      return (
                        <tr
                          key={tx.transactionId}
                          ref={(el) => {
                            rowRefs.current[index] = el
                          }}
                          onClick={(e) => handleRowActivate(tx, index, e)}
                          className={[
                            'transition-colors',
                            editTabOpen ? 'cursor-not-allowed' : 'cursor-pointer',
                            isBulkSelected || isDetailSelected
                              ? 'bg-amber-50/80 dark:bg-amber-950/20'
                              : editTabOpen
                                ? ''
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={[
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                tx.direction === 'INCOME'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                              ].join(' ')}
                            >
                              {tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {tx.paidFrom ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {tx.paidTo ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[220px]">
                            <span className="line-clamp-1">{tx.description ?? '—'}</span>
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
                            <StatusBadge status={tx.status} />
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
            width={panelWidth}
            onWidthChange={setPanelWidth}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            activeFilters={activeFilters}
            onApply={handleApplyFilters}
            selectedTx={selectedTx}
            selectionMixed={selectionMixed}
            editMode={editMode}
            bulkTransactions={bulkTransactions}
            editTabOpen={editTabOpen}
            onStartEdit={handleStartEdit}
            onBulkSaved={handleBulkSaved}
            onRestored={handleRestored}
            onSaveClick={requestSaveEdit}
            onCancelClick={requestCancelEdit}
            onRegisterSave={handleRegisterSave}
            onRequestCancelEdit={requestCancelEdit}
            onDirtyChange={setIsDirty}
            onClose={handleClose}
            onApplyRules={openApplyRulesSelection}
            onApplyRulesToFilter={openApplyRulesFilter}
          />,
          portalRoot,
        )}

      <ConfirmDialog
        open={editConfirm === 'save'}
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
  onActivate,
  selectionBlocked,
}: {
  tx: Transaction
  bulkSelected: boolean
  selected: boolean
  onActivate: (e: React.MouseEvent) => void
  selectionBlocked: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onClick={onActivate}
      className={[
        'bg-white dark:bg-gray-900 border rounded-xl p-4 transition-colors',
        bulkSelected || selected
          ? 'border-[#c9a96e]/60 bg-amber-50/40 dark:bg-amber-950/10'
          : 'border-gray-200 dark:border-gray-800',
        selectionBlocked ? 'cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0 pt-0.5">
          {formatDate(tx.date)}
        </span>
        <ItemAmounts tx={tx} />
      </div>

      <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {tx.description ?? '—'}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate max-w-[120px]">{tx.paidFrom ?? '—'}</span>
        <ArrowRight size={10} className="shrink-0" />
        <span className="truncate max-w-[120px]">{tx.paidTo ?? '—'}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            tx.direction === 'INCOME'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
          ].join(' ')}
        >
          {tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'}
        </span>
        <StatusBadge status={tx.status} />
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
