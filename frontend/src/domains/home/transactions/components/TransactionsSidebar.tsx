import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, Pencil, X, FileText, Plus, Maximize2, Minimize2 } from 'lucide-react'
import type { FlowFilters } from '../types'
import { isFilterValueActive } from '../types'
import type { Transaction } from '@/shared/types'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties, fetchPartiesForClassificationRules } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/parties/types'
import { canCreateRuleFromTransaction } from '@/domains/home/configuration/classification-rules/utils/ruleFromTransaction'
import type { TransactionNewUrlPrefill } from '../utils/transactionNewUrlParams'
import SidePanelShell from '@/shared/components/panel/SidePanelShell'
import EditBulkPanel from './EditBulkPanel'
import TransactionDetailsPanel from './TransactionDetailsPanel'
import TransactionMultiDetailsPanel from './TransactionMultiDetailsPanel'
import TransactionFiltersForm from './filters/TransactionFiltersForm'
import TransactionEditForm from './TransactionEditForm'
import TransactionCreateForm from './TransactionCreateForm'
import { filterPartiesForFilterPanel } from '../utils/partyAssignment'

export type SidebarTab = 'filters' | 'details' | 'edit' | 'create'
export type EditMode = 'bulk' | 'single' | 'create' | null

const EMPTY_FILTERS: FlowFilters = {}

export interface ApplyFiltersOptions {
  closePanel?: boolean
}

export interface TransactionsSidebarProps {
  open: boolean
  width: number
  expanded: boolean
  resizable: boolean
  onWidthChange: (w: number) => void
  onToggleExpand: () => void
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  activeFilters: FlowFilters
  onApply: (filters: FlowFilters, options?: ApplyFiltersOptions) => void
  selectedTx: Transaction | null
  selectionMixed: boolean
  editMode: EditMode
  bulkTransactions: Transaction[]
  isEditing: boolean
  createPrefill: TransactionNewUrlPrefill
  onStartEdit: () => void
  onBulkSaved: () => void
  onSingleSaved: (updated: Transaction) => void
  onCreated: (tx: Transaction) => void
  onRestored: (updated: Transaction) => void
  onDelete: (tx: Transaction) => void
  onSaveClick: () => void
  onCancelClick: () => void
  onRegisterSave: (fn: () => Promise<void>) => void
  onRequestCancelEdit: () => void
  onDirtyChange: (dirty: boolean) => void
  onClose: () => void
  onApplyRules: () => void
  onApplyRulesToFilter: () => void
  onCreateRule: (tx: Transaction) => void
}

function editTabLabel(editMode: EditMode): string {
  if (editMode === 'bulk') return 'Edycja zbiorcza'
  if (editMode === 'single') return 'Edycja'
  if (editMode === 'create') return 'Nowa transakcja'
  return 'Edycja'
}

export default function TransactionsSidebar({
  open,
  width,
  expanded,
  resizable,
  onWidthChange,
  onToggleExpand,
  activeTab,
  onTabChange,
  activeFilters,
  onApply,
  selectedTx,
  selectionMixed,
  editMode,
  bulkTransactions,
  isEditing,
  createPrefill,
  onStartEdit,
  onBulkSaved,
  onSingleSaved,
  onCreated,
  onRestored,
  onDelete,
  onSaveClick,
  onCancelClick,
  onRegisterSave,
  onRequestCancelEdit,
  onDirtyChange,
  onClose,
  onApplyRules,
  onApplyRulesToFilter,
  onCreateRule,
}: TransactionsSidebarProps) {
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<FlowFilters>(EMPTY_FILTERS)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [ruleContextParties, setRuleContextParties] = useState<Party[]>([])

  async function handlePartyCreated() {
    setParties(await fetchParties())
  }

  async function handleCategoryCreated() {
    setCategories(await fetchCategories())
  }

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => {})
    fetchConcerns().then(setConcerns).catch(() => {})
    fetchCategories().then(setCategories).catch(() => {})
    fetchParties().then(setParties).catch(() => {})
    fetchPartiesForClassificationRules().then(setRuleContextParties).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) setDraft(activeFilters)
  }, [open, activeFilters])

  const setField = <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => {
    setDraft((prev) => {
      const nextValue = isFilterValueActive(value) ? value : undefined
      const next = { ...prev, [key]: nextValue }

      if (key === 'directions') {
        const { paidFrom, paidTo } = filterPartiesForFilterPanel(parties)
        const fromIds = new Set(paidFrom.map((p) => String(p.id)))
        const toIds = new Set(paidTo.map((p) => String(p.id)))
        if (next.paidFromPartyId && !fromIds.has(next.paidFromPartyId)) {
          next.paidFromPartyId = undefined
        }
        if (next.paidToPartyId && !toIds.has(next.paidToPartyId)) {
          next.paidToPartyId = undefined
        }
      }

      return next
    })
  }

  const handleClear = () => setDraft(EMPTY_FILTERS)

  const handleApply = () => {
    const clean = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => isFilterValueActive(v)),
    ) as FlowFilters
    onApply(clean, { closePanel: isMobile })
  }

  const handleTabClick = (tab: SidebarTab) => {
    if (isEditing) return
    onTabChange(tab)
  }

  const { paidFrom: paidFromParties, paidTo: paidToParties } = useMemo(
    () => filterPartiesForFilterPanel(parties),
    [parties],
  )

  const tabBar = (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
      <button
        onClick={() => handleTabClick('filters')}
        disabled={isEditing}
        className={[
          'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
          activeTab === 'filters'
            ? 'border-[#c9a96e] text-[#c9a96e]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          isEditing ? 'opacity-40 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <SlidersHorizontal size={13} />
        Filtry
      </button>

      {(selectedTx || bulkTransactions.length > 0) && !isEditing && (
        <button
          onClick={() => handleTabClick('details')}
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
          className={[
            'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
            'border-[#c9a96e] text-[#c9a96e]',
          ].join(' ')}
        >
          {editMode === 'create' ? <Plus size={13} /> : <Pencil size={13} />}
          {editTabLabel(editMode)}
        </button>
      )}

      {!isMobile && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="ml-auto p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
          title={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      <button
        onClick={onClose}
        className={['p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors', isMobile ? 'ml-auto mr-3' : 'mr-3'].join(' ')}
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const filtersContent = (
    <>
      <div className="flex-1 overflow-y-auto min-h-0">
        <TransactionFiltersForm
          draft={draft}
          onFieldChange={setField}
          wallets={wallets}
          concerns={concerns}
          categories={categories}
          paidFromParties={paidFromParties}
          paidToParties={paidToParties}
        />
      </div>
      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Wyczyść filtry
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1c4230' }}
        >
          Zastosuj filtry
        </button>
      </div>
      <div className="px-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={onApplyRulesToFilter}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-[#c9a96e]/50 text-[#8a7340] dark:text-[#c9a96e] hover:bg-[#c9a96e]/10 transition-colors"
        >
          Zastosuj reguły do filtra
        </button>
      </div>
    </>
  )

  const detailsList =
    bulkTransactions.length > 0
      ? bulkTransactions
      : selectedTx
        ? [selectedTx]
        : []

  const detailsContent = (
    <div className="flex-1 overflow-y-auto min-h-0">
      {detailsList.length > 1 ? (
        <TransactionMultiDetailsPanel
          transactions={detailsList}
          selectionMixed={selectionMixed}
          onEdit={onStartEdit}
          onApplyRules={onApplyRules}
        />
      ) : detailsList.length === 1 ? (
        <TransactionDetailsPanel
          tx={detailsList[0]}
          onEdit={onStartEdit}
          onDelete={() => onDelete(detailsList[0])}
          onRestored={onRestored}
          onCreateRule={() => onCreateRule(detailsList[0])}
          canCreateRule={canCreateRuleFromTransaction(detailsList[0], ruleContextParties)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
          <FileText size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wybranej transakcji</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kliknij wiersz na liście</p>
        </div>
      )}
    </div>
  )

  const editContent = (
    <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
      {editMode === 'bulk' && bulkTransactions.length > 0 ? (
        <EditBulkPanel
          transactions={bulkTransactions}
          wallets={wallets}
          concerns={concerns}
          categories={categories}
          parties={parties}
          onSaved={onBulkSaved}
          onSaveClick={onSaveClick}
          onCancelClick={onCancelClick}
          onRegisterSave={onRegisterSave}
          onDirtyChange={onDirtyChange}
          onPartyCreated={handlePartyCreated}
          onCategoryCreated={handleCategoryCreated}
        />
      ) : editMode === 'single' && selectedTx ? (
        <TransactionEditForm
          key={selectedTx.transactionId}
          tx={selectedTx}
          wallets={wallets}
          concerns={concerns}
          categories={categories}
          parties={parties}
          onSaved={onSingleSaved}
          onCancel={onCancelClick}
          onPartyCreated={handlePartyCreated}
          onCategoryCreated={handleCategoryCreated}
        />
      ) : editMode === 'create' ? (
        <TransactionCreateForm
          key={JSON.stringify(createPrefill)}
          prefill={createPrefill}
          wallets={wallets}
          concerns={concerns}
          categories={categories}
          parties={parties}
          onCreated={onCreated}
          onCancel={onCancelClick}
          onPartyCreated={handlePartyCreated}
          onCategoryCreated={handleCategoryCreated}
        />
      ) : null}
    </div>
  )

  const tabContent =
    activeTab === 'filters'
      ? filtersContent
      : activeTab === 'edit' || activeTab === 'create'
        ? editContent
        : detailsContent

  const innerContent = (
    <div className="flex flex-col h-full min-h-0 relative">
      {tabBar}
      <div className="flex flex-col flex-1 min-h-0">{tabContent}</div>
    </div>
  )

  return (
    <SidePanelShell
      open={open}
      width={width}
      resizable={resizable}
      onWidthChange={onWidthChange}
      onClose={onClose}
      backdrop={
        isEditing
          ? { onClick: onRequestCancelEdit, desktopInset: true }
          : null
      }
    >
      {innerContent}
    </SidePanelShell>
  )
}
