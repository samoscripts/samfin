import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import TransactionFiltersForm from '@/domains/home/transactions/components/filters/TransactionFiltersForm'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/parties/types'
import { filterPartiesForFilterPanel } from '@/domains/home/transactions/utils/partyAssignment'
import {
  parseCommaList,
  parseOptionalString,
} from '@/shared/utils/urlQuery'

const PANEL_WIDTH = 420
const VALID_DIRECTIONS = new Set(['EXPENSE', 'INCOME'])

function expandMonthSugar(month: string): Pick<FlowFilters, 'dateFrom' | 'dateTo'> {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) return {}
  const year = Number(match[1])
  const mon = Number(match[2])
  if (mon < 1 || mon > 12) return {}
  const lastDay = new Date(year, mon, 0).getDate()
  const mm = String(mon).padStart(2, '0')
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function parseReportFlowFilters(params: URLSearchParams): FlowFilters {
  const monthSugar = parseOptionalString(params.get('month'))
  const monthRange = monthSugar ? expandMonthSugar(monthSugar) : {}

  const directions = parseCommaList(params.get('direction')).filter((d) =>
    VALID_DIRECTIONS.has(d),
  ) as NonNullable<FlowFilters['directions']>

  return {
    ...monthRange,
    dateFrom: parseOptionalString(params.get('dateFrom')) ?? monthRange.dateFrom,
    dateTo: parseOptionalString(params.get('dateTo')) ?? monthRange.dateTo,
    directions: directions.length > 0 ? directions : undefined,
    statuses: parseCommaList(params.get('status')).length
      ? parseCommaList(params.get('status'))
      : undefined,
    paidFromPartyId: parseOptionalString(params.get('paidFromPartyId')),
    paidToPartyId: parseOptionalString(params.get('paidToPartyId')),
    walletId: parseOptionalString(params.get('walletId')),
    concernId: parseOptionalString(params.get('concernId')),
    categoryId: parseOptionalString(params.get('categoryId')),
    amountMin: parseOptionalString(params.get('amountMin')),
    amountMax: parseOptionalString(params.get('amountMax')),
    description: parseOptionalString(params.get('description')),
  }
}

export function serializeReportFlowFilters(
  filters: FlowFilters,
  base: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base)
  const keys = [
    'dateFrom',
    'dateTo',
    'direction',
    'status',
    'paidFromPartyId',
    'paidToPartyId',
    'walletId',
    'concernId',
    'categoryId',
    'amountMin',
    'amountMax',
    'description',
    'month',
  ] as const
  for (const key of keys) params.delete(key)

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.directions?.length) params.set('direction', filters.directions.join(','))
  if (filters.statuses?.length) params.set('status', filters.statuses.join(','))
  if (filters.paidFromPartyId) params.set('paidFromPartyId', filters.paidFromPartyId)
  if (filters.paidToPartyId) params.set('paidToPartyId', filters.paidToPartyId)
  if (filters.walletId) params.set('walletId', filters.walletId)
  if (filters.concernId) params.set('concernId', filters.concernId)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.amountMin) params.set('amountMin', filters.amountMin)
  if (filters.amountMax) params.set('amountMax', filters.amountMax)
  if (filters.description) params.set('description', filters.description)

  return params
}

interface ReportFiltersPanelProps {
  open: boolean
  onClose: () => void
  activeFilters: FlowFilters
  onApply: (filters: FlowFilters) => void
}

export default function ReportFiltersPanel({
  open,
  onClose,
  activeFilters,
  onApply,
}: ReportFiltersPanelProps) {
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<FlowFilters>(activeFilters)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])

  useEffect(() => {
    if (open) setDraft(activeFilters)
  }, [open, activeFilters])

  useEffect(() => {
    if (!open) return
    Promise.all([fetchWallets(), fetchConcerns(), fetchCategories(), fetchParties()])
      .then(([w, c, cat, p]) => {
        setWallets(w)
        setConcerns(c)
        setCategories(cat)
        setParties(p)
      })
      .catch(() => {})
  }, [open])

  const { paidFrom: paidFromParties, paidTo: paidToParties } = useMemo(
    () => filterPartiesForFilterPanel(parties),
    [parties],
  )

  const handleFieldChange = useCallback(
    <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const header = (
    <div className="flex items-center gap-2 shrink-0 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
      <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
        Filtry raportu
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const footer = (
    <div className="shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
      <button
        type="button"
        onClick={() => setDraft({})}
        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Wyczyść
      </button>
      <button
        type="button"
        onClick={() => {
          onApply(draft)
          onClose()
        }}
        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#163526] text-white hover:bg-[#1e4a32] transition-colors"
      >
        Zastosuj filtry
      </button>
    </div>
  )

  const body = (
    <TransactionFiltersForm
      draft={draft}
      onFieldChange={handleFieldChange}
      wallets={wallets}
      concerns={concerns}
      categories={categories}
      paidFromParties={paidFromParties}
      paidToParties={paidToParties}
    />
  )

  const inner = (
    <div className="flex flex-col h-full min-h-0">
      {header}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{body}</div>
      {footer}
    </div>
  )

  if (!open) return null

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
        <aside
          className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800"
          style={{ width: 'min(100vw, 28rem)' }}
        >
          {inner}
        </aside>
      </>
    )
  }

  return (
    <aside
      className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="flex flex-col h-full min-h-0" style={{ width: PANEL_WIDTH }}>
        {inner}
      </div>
    </aside>
  )
}

export function useReportFiltersPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('panel') === 'filters'

  const openPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('panel', 'filters')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const closePanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('panel')
      return params
    }, { replace: true })
  }, [setSearchParams])

  return { open, openPanel, closePanel }
}
