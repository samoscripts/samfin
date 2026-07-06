import { useCallback, useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useSidebarDraftSync } from '@/shared/hooks/useSidebarDraftSync'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import ReportPeriodSection from '@/domains/home/reports/shared/components/ReportPeriodSection'
import type { ParsedReportPeriodState, ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import type { TrendQueryState } from '@/domains/home/reports/trend/types/trend'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import ChartStyleSection from '@/domains/home/reports/shared/components/ChartStyleSection'
import ReportSidebarTabs, {
  useReportSidebarTab,
} from '@/domains/home/reports/shared/components/ReportSidebarTabs'
import {
  TrendDirectionSection,
  TrendSeriesBySection,
} from '@/domains/home/reports/trend/components/TrendSidebarSections'
import {
  TrendCategorySeriesPicker,
  TrendDescriptionTermsPicker,
  TrendDictionarySeriesPicker,
  TrendNarrowFilters,
} from '@/domains/home/reports/trend/components/TrendSeriesPickers'

const PANEL_WIDTH = 420

interface TrendSidebarProps {
  open: boolean
  onClose: () => void
  period: ParsedReportPeriodState
  onPeriodModeChange: (mode: ReportPeriodMode) => void
  onPeriodNavigate: (direction: -1 | 1) => void
  onPeriodJumpToCurrent: () => void
  onPeriodRangeChange: (dateFrom: string, dateTo: string) => void
  activeQuery: TrendQueryState
  appliedFilterSignature: string
  onApplyQuery: (query: TrendQueryState) => void
  chartStyle: ChartStyle
  onChartStyleChange: (style: ChartStyle) => void
}

export default function TrendSidebar({
  open,
  onClose,
  period,
  onPeriodModeChange,
  onPeriodNavigate,
  onPeriodJumpToCurrent,
  onPeriodRangeChange,
  activeQuery,
  appliedFilterSignature,
  onApplyQuery,
  chartStyle,
  onChartStyleChange,
}: TrendSidebarProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useReportSidebarTab(open)
  const [draft, setDraft] = useSidebarDraftSync(open, activeQuery, appliedFilterSignature)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (!open) return
    setDraft((prev) =>
      prev.granularity === activeQuery.granularity
        ? prev
        : { ...prev, granularity: activeQuery.granularity },
    )
  }, [open, activeQuery.granularity, setDraft])

  useEffect(() => {
    if (!open) return
    Promise.all([fetchWallets(), fetchConcerns(), fetchCategories()])
      .then(([w, c, cat]) => {
        setWallets(w)
        setConcerns(c)
        setCategories(cat)
      })
      .catch(() => {})
  }, [open])

  const patchDraft = useCallback((patch: Partial<TrendQueryState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      if (patch.seriesBy && patch.seriesBy !== prev.seriesBy) {
        next.terms = []
        next.categoryIds = []
        next.walletIds = []
        next.concernIds = []
      }
      return next
    })
  }, [])

  const narrowChange = useCallback(
    <K extends keyof TrendQueryState['narrow']>(
      key: K,
      value: TrendQueryState['narrow'][K],
    ) => {
      setDraft((prev) => ({
        ...prev,
        narrow: { ...prev.narrow, [key]: value },
      }))
    },
    [],
  )

  const seriesPickerLabel =
    draft.seriesBy === 'description'
      ? 'Opisy do porównania'
      : draft.seriesBy === 'category'
        ? 'Kategorie do porównania'
        : draft.seriesBy === 'wallet'
          ? 'Portfele do porównania'
          : draft.seriesBy === 'concern'
            ? 'Dotyczy — porównanie'
            : ''

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
        onClick={() =>
          setDraft({
            seriesBy: 'none',
            terms: [],
            categoryIds: [],
            walletIds: [],
            concernIds: [],
            directions: ['EXPENSE'],
            narrow: {},
          })
        }
        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Wyczyść
      </button>
      <button
        type="button"
        onClick={() => onApplyQuery(draft)}
        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#163526] text-white hover:bg-[#1e4a32] transition-colors"
      >
        Zastosuj
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

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <TrendDirectionSection
        directions={draft.directions}
        onChange={(directions) => patchDraft({ directions })}
      />

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <TrendSeriesBySection
        value={draft.seriesBy}
        onChange={(seriesBy) => patchDraft({ seriesBy })}
      />

      {draft.seriesBy !== 'none' && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {seriesPickerLabel}
            </p>
            {draft.seriesBy === 'description' && (
              <TrendDescriptionTermsPicker
                terms={draft.terms}
                onChange={(terms) => patchDraft({ terms })}
              />
            )}
            {draft.seriesBy === 'category' && (
              <TrendCategorySeriesPicker
                categoryIds={draft.categoryIds}
                categories={categories}
                onChange={(categoryIds) => patchDraft({ categoryIds })}
              />
            )}
            {draft.seriesBy === 'wallet' && (
              <TrendDictionarySeriesPicker
                label="Portfel"
                ids={draft.walletIds}
                items={wallets}
                onChange={(walletIds) => patchDraft({ walletIds })}
              />
            )}
            {draft.seriesBy === 'concern' && (
              <TrendDictionarySeriesPicker
                label="Dotyczy"
                ids={draft.concernIds}
                items={concerns}
                onChange={(concernIds) => patchDraft({ concernIds })}
              />
            )}
          </div>
        </>
      )}

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <TrendNarrowFilters
        seriesBy={draft.seriesBy}
        narrow={draft.narrow}
        onNarrowChange={narrowChange}
        concerns={concerns}
        categories={categories}
        wallets={wallets}
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
