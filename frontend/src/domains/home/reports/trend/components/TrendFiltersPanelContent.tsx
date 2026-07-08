import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import type { ReportSavedPanelProps } from '@/domains/home/reports/shared/components/ReportFiltersPanelContent'
import LoadedReportBanner from '@/domains/home/reports/shared/components/LoadedReportBanner'
import ReportParamsFooter from '@/domains/home/reports/shared/components/ReportParamsFooter'
import ReportSavedList, { useReportSavedList } from '@/domains/home/reports/shared/components/ReportSavedList'
import ReportSavedFormModal from '@/domains/home/reports/shared/components/ReportSavedFormModal'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
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
import { isReportPanelOpen } from '@/domains/home/reports/shared/utils/reportPanelUrl'

interface TrendFiltersPanelContentProps {
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
  savedReport?: ReportSavedPanelProps
}

export default function TrendFiltersPanelContent({
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
  savedReport,
}: TrendFiltersPanelContentProps) {
  const [searchParams] = useSearchParams()
  const panelOpen = isReportPanelOpen(searchParams)
  const [activeTab, setActiveTab] = useReportSidebarTab(panelOpen)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [draft, setDraft] = useSidebarDraftSync(panelOpen, activeQuery, appliedFilterSignature)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const listState = useReportSavedList(
    savedReport?.listRefreshKey ?? 0,
    savedReport?.loadReportList ?? (async () => []),
  )

  useEffect(() => {
    if (!panelOpen) return
    setDraft((prev) =>
      prev.granularity === activeQuery.granularity
        ? prev
        : { ...prev, granularity: activeQuery.granularity },
    )
  }, [panelOpen, activeQuery.granularity, setDraft])

  useEffect(() => {
    if (!panelOpen) return
    Promise.all([fetchWallets(), fetchConcerns(), fetchCategories()])
      .then(([w, c, cat]) => {
        setWallets(w)
        setConcerns(c)
        setCategories(cat)
      })
      .catch(() => {})
  }, [panelOpen])

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
  }, [setDraft])

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
    [setDraft],
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

  const footer = savedReport ? null : (
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

  const handleApply = useCallback(() => {
    onApplyQuery(draft)
    savedReport?.onApplyDraft()
  }, [draft, onApplyQuery, savedReport])

  const handleUpdateConfirm = useCallback(async () => {
    if (!savedReport) return
    setUpdateLoading(true)
    try {
      onApplyQuery(draft)
      savedReport.onApplyDraft()
      await savedReport.onUpdateReport()
      setUpdateConfirmOpen(false)
    } finally {
      setUpdateLoading(false)
    }
  }, [draft, onApplyQuery, savedReport])

  const paramsBody = (
    <div className="space-y-6">
      {savedReport?.loadedReport && (
        <LoadedReportBanner
          name={savedReport.loadedReport.name}
          description={savedReport.loadedReport.description}
          onRename={() => setRenameModalOpen(true)}
        />
      )}

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

  const savedBody = savedReport ? (
    <ReportSavedList
      items={listState.items}
      loading={listState.loading}
      error={listState.error}
      activeId={savedReport.loadedReport?.id ?? null}
      onSelect={(report) => {
        savedReport.onSelectReport(report)
        setActiveTab('params')
      }}
      onDelete={savedReport.onDeleteReport}
    />
  ) : null

  const configBody = (
    <ChartStyleSection value={chartStyle} onChange={onChartStyleChange} />
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ReportSidebarTabs active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {activeTab === 'params' ? paramsBody : activeTab === 'saved' ? savedBody : configBody}
      </div>
      {activeTab === 'params' && savedReport && (
        <ReportParamsFooter
          onApply={handleApply}
          onCreate={() => setCreateModalOpen(true)}
          onUpdate={() => setUpdateConfirmOpen(true)}
          updateDisabled={!savedReport.loadedReport}
        />
      )}
      {activeTab === 'params' ? footer : null}

      {savedReport && (
        <>
          <ReportSavedFormModal
            open={createModalOpen}
            title="Utwórz raport"
            submitLabel="Utwórz"
            onClose={() => setCreateModalOpen(false)}
            onSubmit={async ({ name, description }) => {
              onApplyQuery(draft)
              savedReport.onApplyDraft()
              await savedReport.onCreateReport(name, description || null)
            }}
          />
          <ReportSavedFormModal
            open={renameModalOpen}
            title="Zmień raport"
            submitLabel="Zapisz"
            initialName={savedReport.loadedReport?.name ?? ''}
            initialDescription={savedReport.loadedReport?.description ?? ''}
            onClose={() => setRenameModalOpen(false)}
            onSubmit={async ({ name, description }) => {
              await savedReport.onRenameReport(name, description || null)
            }}
          />
          <ConfirmDialog
            open={updateConfirmOpen}
            title="Aktualizuj raport"
            message={
              savedReport.loadedReport
                ? `Czy na pewno chcesz zmienić raport „${savedReport.loadedReport.name}"?`
                : ''
            }
            confirmLabel="Aktualizuj"
            loading={updateLoading}
            onConfirm={() => void handleUpdateConfirm()}
            onCancel={() => !updateLoading && setUpdateConfirmOpen(false)}
          />
        </>
      )}
    </div>
  )
}
