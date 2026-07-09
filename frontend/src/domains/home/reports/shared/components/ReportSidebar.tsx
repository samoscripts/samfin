import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import ReportFiltersForm from '@/domains/home/reports/shared/components/ReportFiltersForm'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/general/parties/types'
import { filterPartiesForFilterPanel } from '@/domains/home/transactions/utils/partyAssignment'
import ReportPeriodSection from '@/domains/home/reports/shared/components/ReportPeriodSection'
import ReportWalletSection from '@/domains/home/reports/shared/components/ReportWalletSection'
import type { ParsedReportPeriodState, ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import { parseOptionalString } from '@/shared/utils/urlQuery'
import type { BreakdownDirections } from '@/domains/home/reports/shared/types/breakdown'
import { hasBothBreakdownDirections } from '@/domains/home/reports/breakdown/utils/breakdownUrl'
import { countActiveReportFilterChips } from '@/domains/home/reports/shared/components/ReportFilterChips'
import { useSidebarDraftSync } from '@/shared/hooks/useSidebarDraftSync'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import ChartStyleSection from '@/domains/home/reports/shared/components/ChartStyleSection'
import ReportSidebarTabs, {
  useReportSidebarTab,
} from '@/domains/home/reports/shared/components/ReportSidebarTabs'
import {
  closeReportPanelParams,
  isReportPanelOpen,
  openReportPanelParams,
} from '@/domains/home/reports/shared/utils/reportPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

const PANEL_WIDTH = 420

const FILTER_PARAM_KEYS = [
  'paidFromPartyId',
  'paidToPartyId',
  'concernId',
  'categoryId',
  'amountMin',
  'amountMax',
  'description',
] as const

export function parseReportFlowFilters(params: URLSearchParams): FlowFilters {
  return {
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
  for (const key of FILTER_PARAM_KEYS) params.delete(key)
  params.delete('walletId')
  params.delete('direction')
  params.delete('status')

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

export function countReportFilters(filters: FlowFilters): number {
  return countActiveReportFilterChips(filters)
}

export function flowFiltersSignature(filters: FlowFilters): string {
  return [
    filters.paidFromPartyId ?? '',
    filters.paidToPartyId ?? '',
    filters.walletId ?? '',
    filters.concernId ?? '',
    filters.categoryId ?? '',
    filters.amountMin ?? '',
    filters.amountMax ?? '',
    filters.description ?? '',
  ].join('\x1f')
}

interface ReportSidebarProps {
  open: boolean
  onClose: () => void
  period: ParsedReportPeriodState
  onPeriodModeChange: (mode: ReportPeriodMode) => void
  onPeriodNavigate: (direction: -1 | 1) => void
  onPeriodJumpToCurrent: () => void
  onPeriodRangeChange: (dateFrom: string, dateTo: string) => void
  walletId: string
  onWalletChange: (walletId: string) => void
  activeFilters: FlowFilters
  onApplyFilters: (filters: FlowFilters) => void
  reportDirections?: BreakdownDirections
  chartStyle: ChartStyle
  onChartStyleChange: (style: ChartStyle) => void
  extraSections?: ReactNode
}

export default function ReportSidebar({
  open,
  onClose,
  period,
  onPeriodModeChange,
  onPeriodNavigate,
  onPeriodJumpToCurrent,
  onPeriodRangeChange,
  walletId,
  onWalletChange,
  activeFilters,
  onApplyFilters,
  reportDirections,
  chartStyle,
  onChartStyleChange,
  extraSections,
}: ReportSidebarProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useReportSidebarTab(open)
  const appliedFilterDraft = useMemo(() => {
    const { walletId: _, ...filterDraft } = activeFilters
    return filterDraft
  }, [activeFilters])
  const appliedFilterSignature = useMemo(
    () => flowFiltersSignature(activeFilters),
    [activeFilters],
  )
  const [draft, setDraft] = useSidebarDraftSync(open, appliedFilterDraft, appliedFilterSignature)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])

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
        Filtry i okres
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
        Wyczyść filtry
      </button>
      <button
        type="button"
        onClick={() => onApplyFilters(draft)}
        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#163526] text-white hover:bg-[#1e4a32] transition-colors"
      >
        Zastosuj filtry
      </button>
    </div>
  )

  const paramsBody = (
    <div className="space-y-6">
      <ReportPeriodSection
        period={period}
        onModeChange={onPeriodModeChange}
        onNavigate={onPeriodNavigate}
        onJumpToCurrent={onPeriodJumpToCurrent}
        onRangeChange={onPeriodRangeChange}
      />

      {extraSections && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          {extraSections}
        </>
      )}

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <ReportWalletSection
        wallets={wallets}
        walletId={walletId}
        onChange={onWalletChange}
      />

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <ReportFiltersForm
        draft={draft}
        onFieldChange={handleFieldChange}
        concerns={concerns}
        categories={categories}
        paidFromParties={paidFromParties}
        paidToParties={paidToParties}
        reportDirections={reportDirections}
        categorySelectDirection={
          reportDirections && !hasBothBreakdownDirections(reportDirections)
            ? reportDirections[0]
            : ''
        }
      />
    </div>
  )

  const configBody = (
    <ChartStyleSection value={chartStyle} onChange={onChartStyleChange} />
  )

  const body = (
    <div className="flex flex-col flex-1 min-h-0">
      <ReportSidebarTabs active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {activeTab === 'params' ? paramsBody : configBody}
      </div>
    </div>
  )

  const inner = (
    <div className="flex flex-col h-full min-h-0">
      {header}
      {body}
      {activeTab === 'params' ? footer : null}
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

export function useReportSidebar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const open = isReportPanelOpen(searchParams)

  const openPanel = useCallback(() => {
    const next = openReportPanelParams(searchParams)
    if (!searchParamsEqual(searchParams, next)) {
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const closePanel = useCallback(() => {
    const next = closeReportPanelParams(searchParams)
    if (!searchParamsEqual(searchParams, next)) {
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return { open, openPanel, closePanel }
}
