import { useEffect, useMemo, useState } from 'react'

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

import EditBulkPanel from './EditBulkPanel'

import TransactionDetailsPanel from './TransactionDetailsPanel'

import TransactionMultiDetailsPanel from './TransactionMultiDetailsPanel'

import TransactionFiltersForm from './filters/TransactionFiltersForm'

import { filterPartiesForFilterPanel } from '../utils/partyAssignment'



export type SidebarTab = 'filters' | 'details' | 'edit'

export type EditMode = 'single' | 'bulk' | null



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

  singleEditTx: Transaction | null

  selectionMixed: boolean

  editMode: EditMode

  bulkTransactions: Transaction[]

  editTabOpen: boolean

  onStartEdit: () => void

  onSaved: (updated: Transaction) => void

  onBulkSaved: () => void

  onRestored: (updated: Transaction) => void

  onSaveClick: () => void

  onCancelClick: () => void

  onRegisterSave: (fn: () => Promise<void>) => void

  onRequestCancelEdit: () => void

  onDirtyChange: (dirty: boolean) => void

  onClose: () => void

  onApplyRules: () => void

  onApplyRulesToFilter: () => void

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

  singleEditTx,

  selectionMixed,

  editMode,

  bulkTransactions,

  editTabOpen,

  onStartEdit,

  onSaved,

  onBulkSaved,

  onRestored,

  onSaveClick,

  onCancelClick,

  onRegisterSave,

  onRequestCancelEdit,

  onDirtyChange,

  onClose,

  onApplyRules,

  onApplyRulesToFilter,

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

    setDraft((prev) => {

      const next = { ...prev, [key]: value || undefined }



      if (key === 'direction') {

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



  const { paidFrom: paidFromParties, paidTo: paidToParties } = useMemo(

    () => filterPartiesForFilterPanel(parties),

    [parties],

  )



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



      {(selectedTx || bulkTransactions.length > 0) && (

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

          {editMode === 'bulk' ? 'Edycja zbiorcza' : 'Edycja'}

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

      <TransactionFiltersForm

        draft={draft}

        onFieldChange={setField}

        wallets={wallets}

        concerns={concerns}

        categories={categories}

        paidFromParties={paidFromParties}

        paidToParties={paidToParties}

      />



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



  const detailsContent =

    detailsList.length > 1 ? (

      <TransactionMultiDetailsPanel

        transactions={detailsList}

        selectionMixed={selectionMixed}

        onEdit={onStartEdit}

        onApplyRules={onApplyRules}

      />

    ) : detailsList.length === 1 ? (

      <TransactionDetailsPanel tx={detailsList[0]} onEdit={onStartEdit} onRestored={onRestored} />

    ) : (

      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">

        <FileText size={28} className="text-gray-300 dark:text-gray-700 mb-3" />

        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wybranej transakcji</p>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kliknij wiersz na liście</p>

      </div>

    )



  const editContent =

    editTabOpen && editMode === 'bulk' && bulkTransactions.length > 0 ? (

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

      />

    ) : singleEditTx && editTabOpen && editMode === 'single' ? (

      <EditSinglePanel

        tx={singleEditTx}

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


