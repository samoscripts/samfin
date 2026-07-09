import { useCallback, useState } from 'react'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/general/parties/types'
import type { FlowFilters } from '../../types'
import { isFilterValueActive } from '../../types'
import TransactionFiltersForm from './TransactionFiltersForm'
import TransactionFilterSidebarTabs, {
  useTransactionFilterSidebarTab,
} from './TransactionFilterSidebarTabs'
import TransactionFilterSavedList, {
  useTransactionFilterSavedList,
} from './TransactionFilterSavedList'
import LoadedReportBanner from '@/domains/home/reports/shared/components/LoadedReportBanner'
import ReportSavedFormModal from '@/domains/home/reports/shared/components/ReportSavedFormModal'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import type { TransactionFilterSaved } from '@/shared/api/transactionFilterSaved'

export interface TransactionFilterSavedPanelProps {
  loadedFilter: TransactionFilterSaved | null
  listRefreshKey: number
  onCreateFilter: (name: string, description: string | null, filters: FlowFilters) => Promise<unknown>
  onUpdateFilter: (filters: FlowFilters) => Promise<unknown>
  onRenameFilter: (name: string, description: string | null) => Promise<unknown>
  onSelectFilter: (filter: TransactionFilterSaved) => void
  onDeleteFilter: (filter: TransactionFilterSaved) => Promise<void>
  loadFilterList: () => Promise<TransactionFilterSaved[]>
}

export interface TransactionFiltersPanelContentProps {
  panelOpen: boolean
  draft: FlowFilters
  onFieldChange: <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => void
  onApply: () => void
  onClear: () => void
  onApplyRulesToFilter: () => void
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  paidFromParties: Party[]
  paidToParties: Party[]
  savedFilter: TransactionFilterSavedPanelProps
}

export default function TransactionFiltersPanelContent({
  panelOpen,
  draft,
  onFieldChange,
  onApply,
  onClear,
  onApplyRulesToFilter,
  wallets,
  concerns,
  categories,
  paidFromParties,
  paidToParties,
  savedFilter,
}: TransactionFiltersPanelContentProps) {
  const [activeTab, setActiveTab] = useTransactionFilterSidebarTab(panelOpen)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)

  const listState = useTransactionFilterSavedList(
    savedFilter.listRefreshKey,
    savedFilter.loadFilterList,
  )

  const handleApply = useCallback(() => {
    onApply()
  }, [onApply])

  const handleUpdateConfirm = useCallback(async () => {
    setUpdateLoading(true)
    try {
      const clean = cleanDraft(draft)
      onApply()
      await savedFilter.onUpdateFilter(clean)
      setUpdateConfirmOpen(false)
    } finally {
      setUpdateLoading(false)
    }
  }, [draft, onApply, savedFilter])

  const filtersBody = (
    <div className="px-5 py-4 space-y-4">
      {savedFilter.loadedFilter && (
        <LoadedReportBanner
          label="Zaczytany filtr"
          name={savedFilter.loadedFilter.name}
          description={savedFilter.loadedFilter.description}
          onRename={() => setRenameModalOpen(true)}
        />
      )}
      <TransactionFiltersForm
        draft={draft}
        onFieldChange={onFieldChange}
        wallets={wallets}
        concerns={concerns}
        categories={categories}
        paidFromParties={paidFromParties}
        paidToParties={paidToParties}
      />
    </div>
  )

  const savedBody = (
    <div className="px-5 py-4">
      <TransactionFilterSavedList
        items={listState.items}
        loading={listState.loading}
        error={listState.error}
        activeId={savedFilter.loadedFilter?.id ?? null}
        onSelect={(filter) => {
          savedFilter.onSelectFilter(filter)
          setActiveTab('filters')
        }}
        onDelete={savedFilter.onDeleteFilter}
      />
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TransactionFilterSidebarTabs active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'filters' ? filtersBody : savedBody}
      </div>

      {activeTab === 'filters' && (
        <>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
            <button
              type="button"
              onClick={onClear}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Wyczyść filtry
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1c4230' }}
            >
              Zastosuj filtry
            </button>
          </div>
          <div className="px-5 pb-2 shrink-0 flex gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Zapisz filtr
            </button>
            <button
              type="button"
              onClick={() => setUpdateConfirmOpen(true)}
              disabled={!savedFilter.loadedFilter}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              Aktualizuj
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
      )}

      <ReportSavedFormModal
        open={createModalOpen}
        title="Zapisz filtr"
        submitLabel="Zapisz"
        nameLabel="Nazwa filtra"
        nameRequiredMessage="Podaj nazwę filtra."
        saveErrorMessage="Nie udało się zapisać filtra."
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async ({ name, description }) => {
          const clean = cleanDraft(draft)
          onApply()
          await savedFilter.onCreateFilter(name, description || null, clean)
        }}
      />
      <ReportSavedFormModal
        open={renameModalOpen}
        title="Zmień filtr"
        submitLabel="Zapisz"
        nameLabel="Nazwa filtra"
        nameRequiredMessage="Podaj nazwę filtra."
        saveErrorMessage="Nie udało się zapisać filtra."
        initialName={savedFilter.loadedFilter?.name ?? ''}
        initialDescription={savedFilter.loadedFilter?.description ?? ''}
        onClose={() => setRenameModalOpen(false)}
        onSubmit={async ({ name, description }) => {
          await savedFilter.onRenameFilter(name, description || null)
        }}
      />
      <ConfirmDialog
        open={updateConfirmOpen}
        title="Aktualizuj filtr"
        message={
          savedFilter.loadedFilter
            ? `Czy na pewno chcesz zmienić filtr „${savedFilter.loadedFilter.name}"?`
            : ''
        }
        confirmLabel="Aktualizuj"
        loading={updateLoading}
        onConfirm={() => void handleUpdateConfirm()}
        onCancel={() => !updateLoading && setUpdateConfirmOpen(false)}
      />
    </div>
  )
}

function cleanDraft(draft: FlowFilters): FlowFilters {
  return Object.fromEntries(
    Object.entries(draft).filter(([, v]) => isFilterValueActive(v)),
  ) as FlowFilters
}
