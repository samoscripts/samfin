import { useEffect, useState } from 'react'
import { SlidersHorizontal, Pencil, X, FileText } from 'lucide-react'
import type { FlowFilters } from '../types'
import type { Transaction } from '@/shared/types'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/parties/types'
import EditSinglePanel from './EditSinglePanel'
import TransactionDetailsPanel from './TransactionDetailsPanel'

export type SidebarTab = 'filters' | 'details' | 'edit'

const EMPTY_FILTERS: FlowFilters = {}
const MIN_WIDTH = 280
const MAX_WIDTH = 640

export interface TransactionsSidebarProps {
  open: boolean
  width: number
  onWidthChange: (w: number) => void
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  activeFilters: FlowFilters
  onApply: (filters: FlowFilters) => void
  selectedTx: Transaction | null
  editTabOpen: boolean
  onStartEdit: () => void
  onSaved: (updated: Transaction) => void
  onSaveClick: () => void
  onCancelClick: () => void
  onRegisterSave: (fn: () => Promise<void>) => void
  onRequestCancelEdit: () => void
  onDirtyChange: (dirty: boolean) => void
  onClose: () => void
}

export default function TransactionsSidebar({
  open,
  width,
  onWidthChange,
  activeTab,
  onTabChange,
  activeFilters,
  onApply,
  selectedTx,
  editTabOpen,
  onStartEdit,
  onSaved,
  onSaveClick,
  onCancelClick,
  onRegisterSave,
  onRequestCancelEdit,
  onDirtyChange,
  onClose,
}: TransactionsSidebarProps) {
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<FlowFilters>(EMPTY_FILTERS)

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])

  useEffect(() => {
    fetchWallets().then(setWallets).catch(() => {})
    fetchConcerns().then(setConcerns).catch(() => {})
    fetchCategories().then(setCategories).catch(() => {})
    fetchParties().then(setParties).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) setDraft(activeFilters)
  }, [open, activeFilters])

  const setField = <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleClear = () => setDraft(EMPTY_FILTERS)

  const handleApply = () => {
    const clean = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v !== '' && v !== undefined),
    ) as FlowFilters
    onApply(clean)
    if (isMobile) onClose()
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMouseMove = (mv: MouseEvent) => {
      onWidthChange(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (startX - mv.clientX))))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleTabClick = (tab: SidebarTab) => {
    if (editTabOpen) return
    onTabChange(tab)
  }

  const paidFromParties = parties.filter((p) => p.usageType === 'INCOME' || p.usageType === 'BOTH')
  const paidToParties = parties.filter((p) => p.usageType === 'EXPENSE' || p.usageType === 'BOTH')

  const tabBar = (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
      <button
        onClick={() => handleTabClick('filters')}
        disabled={editTabOpen}
        className={[
          'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
          activeTab === 'filters'
            ? 'border-[#c9a96e] text-[#c9a96e]'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          editTabOpen ? 'opacity-40 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <SlidersHorizontal size={13} />
        Filtry
      </button>

      {selectedTx && (
        <button
          onClick={() => handleTabClick('details')}
          disabled={editTabOpen}
          className={[
            'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
            activeTab === 'details'
              ? 'border-[#c9a96e] text-[#c9a96e]'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            editTabOpen ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <FileText size={13} />
          Szczegóły
        </button>
      )}

      {editTabOpen && (
        <button
          className={[
            'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
            'border-[#c9a96e] text-[#c9a96e]',
          ].join(' ')}
        >
          <Pencil size={13} />
          Edycja
        </button>
      )}

      <button
        onClick={onClose}
        className="ml-auto mr-3 p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const filtersContent = (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <Section label="Okres">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data od">
              <input
                type="date"
                value={draft.dateFrom ?? ''}
                onChange={(e) => setField('dateFrom', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Data do">
              <input
                type="date"
                value={draft.dateTo ?? ''}
                onChange={(e) => setField('dateTo', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>
        <Hr />
        <Section label="Typ operacji">
          <select
            value={draft.direction ?? ''}
            onChange={(e) => setField('direction', e.target.value as FlowFilters['direction'])}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            <option value="INCOME">Wpływ</option>
            <option value="EXPENSE">Wydatek</option>
          </select>
        </Section>
        <Hr />
        <Section label="Kwota (zł)">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Od">
              <input
                type="number"
                min={0}
                placeholder="0,00"
                value={draft.amountMin ?? ''}
                onChange={(e) => setField('amountMin', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Do">
              <input
                type="number"
                min={0}
                placeholder="∞"
                value={draft.amountMax ?? ''}
                onChange={(e) => setField('amountMax', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>
        <Hr />
        <Section label="Portfel">
          <select
            value={draft.walletId ?? ''}
            onChange={(e) => setField('walletId', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            {wallets
              .filter((w) => w.active)
              .map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name}
                </option>
              ))}
          </select>
        </Section>
        <Section label="Dotyczy">
          <select
            value={draft.concernId ?? ''}
            onChange={(e) => setField('concernId', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            {concerns
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
        </Section>
        <Section label="Kategoria">
          <select
            value={draft.categoryId ?? ''}
            onChange={(e) => setField('categoryId', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
          </select>
        </Section>
        <Section label="Status">
          <select
            value={draft.status ?? ''}
            onChange={(e) => setField('status', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            <option value="CLASSIFIED">Sklasyfikowany</option>
            <option value="PARTIALLY_CLASSIFIED">Częściowo</option>
            <option value="UNCLASSIFIED">Nieklasyfikowany</option>
          </select>
        </Section>
        <Hr />
        <Section label="Skąd">
          <select
            value={draft.paidFromPartyId ?? ''}
            onChange={(e) => setField('paidFromPartyId', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            {paidFromParties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </Section>
        <Section label="Dokąd">
          <select
            value={draft.paidToPartyId ?? ''}
            onChange={(e) => setField('paidToPartyId', e.target.value)}
            className={inputCls}
          >
            <option value="">Wszystkie</option>
            {paidToParties.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </Section>
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
    </>
  )

  const detailsContent = selectedTx ? (
    <TransactionDetailsPanel tx={selectedTx} onEdit={onStartEdit} />
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
      <FileText size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wybranej transakcji</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kliknij wiersz na liście</p>
    </div>
  )

  const editContent =
    selectedTx && editTabOpen ? (
      <EditSinglePanel
        tx={selectedTx}
        wallets={wallets}
        concerns={concerns}
        categories={categories}
        parties={parties}
        onSaved={onSaved}
        onSaveClick={onSaveClick}
        onCancelClick={onCancelClick}
        onRegisterSave={onRegisterSave}
        onDirtyChange={onDirtyChange}
      />
    ) : null

  const tabContent =
    activeTab === 'filters' ? filtersContent : activeTab === 'edit' ? editContent : detailsContent

  const innerContent = (
    <div className="flex flex-col h-full min-h-0 relative">
      {tabBar}
      {tabContent}
    </div>
  )

  if (isMobile) {
    return (
      <>
        {editTabOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onRequestCancelEdit}
            aria-hidden="true"
          />
        )}
        <aside
          className={[
            'fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col',
            'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
            'transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >
          {innerContent}
        </aside>
      </>
    )
  }

  return (
    <>
      {editTabOpen && (
        <div
          className="fixed inset-y-0 left-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300"
          style={{ right: width }}
          onClick={onRequestCancelEdit}
          aria-hidden="true"
        />
      )}
      <aside
        className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{ width: open ? width : 0 }}
      >
      {open && (
        <div
          className="absolute left-0 inset-y-0 w-1.5 cursor-col-resize z-10 group"
          onMouseDown={startResize}
        >
          <div className="h-full w-px ml-0.5 bg-transparent group-hover:bg-[#c9a96e]/40 transition-colors" />
        </div>
      )}
      <div className="flex flex-col h-full min-h-0" style={{ width }}>
        {innerContent}
      </div>
    </aside>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

function Hr() {
  return <div className="border-t border-gray-100 dark:border-gray-800" />
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'placeholder-gray-400 dark:placeholder-gray-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'
