import { useEffect, useState } from 'react'
import { SlidersHorizontal, X, Maximize2, Minimize2 } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import {
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
} from '../constants/panelLayout'
import type { RuleListFilters } from '../types/ruleFilters'
import { EMPTY_RULE_FILTERS, isRuleFilterValueActive } from '../types/ruleFilters'
import { cleanRuleFilters } from '../utils/ruleUrlParams'
import ClassificationRulesFiltersForm from './filters/ClassificationRulesFiltersForm'

export interface ApplyRuleFiltersOptions {
  closePanel?: boolean
}

export interface ClassificationRulesSidebarProps {
  open: boolean
  width: number
  expanded: boolean
  resizable: boolean
  onWidthChange: (w: number) => void
  onToggleExpand: () => void
  partyId: number | null
  activeFilters: RuleListFilters
  onApply: (filters: RuleListFilters, partyId: number | null, options?: ApplyRuleFiltersOptions) => void
  ruleContextParties: Party[]
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  onClose: () => void
}

export default function ClassificationRulesSidebar({
  open,
  width,
  expanded,
  resizable,
  onWidthChange,
  onToggleExpand,
  partyId,
  activeFilters,
  onApply,
  ruleContextParties,
  wallets,
  concerns,
  categories,
  onClose,
}: ClassificationRulesSidebarProps) {
  const isMobile = useIsMobile()
  const [draftFilters, setDraftFilters] = useState<RuleListFilters>(EMPTY_RULE_FILTERS)
  const [draftPartyId, setDraftPartyId] = useState<number | null>(partyId)

  useEffect(() => {
    if (open) {
      setDraftFilters(activeFilters)
      setDraftPartyId(partyId)
    }
  }, [open, activeFilters, partyId])

  const setField = (key: keyof RuleListFilters, value: string | undefined) => {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: isRuleFilterValueActive(value) ? value : undefined,
    }))
  }

  const handleClear = () => {
    setDraftFilters(EMPTY_RULE_FILTERS)
  }

  const handleApply = () => {
    onApply(cleanRuleFilters(draftFilters), draftPartyId, { closePanel: isMobile })
  }

  const startResize = (e: React.MouseEvent) => {
    if (!resizable) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMouseMove = (mv: MouseEvent) => {
      onWidthChange(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth + (startX - mv.clientX))))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const innerContent = (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
        <button
          className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 border-[#c9a96e] text-[#c9a96e] -mb-px"
        >
          <SlidersHorizontal size={13} />
          Filtry
        </button>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="ml-auto p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        <button
          onClick={onClose}
          className={['p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-300', isMobile ? 'ml-auto mr-3' : 'mr-3'].join(' ')}
          aria-label="Zamknij panel"
        >
          <X size={14} />
        </button>
      </div>

      <ClassificationRulesFiltersForm
        draft={draftFilters}
        partyId={draftPartyId}
        onPartyIdChange={setDraftPartyId}
        onFieldChange={setField}
        ruleContextParties={ruleContextParties}
        wallets={wallets}
        concerns={concerns}
        categories={categories}
      />

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Wyczyść filtry
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: '#1c4230' }}
        >
          Zastosuj filtry
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col',
          'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {innerContent}
      </aside>
    )
  }

  return (
    <aside
      className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: open ? width : 0 }}
    >
      {open && resizable && (
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
  )
}
