import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportFiltersForm from '@/domains/home/reports/shared/components/ReportFiltersForm'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import { fetchConcerns, type Concern } from '@/shared/api/concerns'
import { fetchCategories, type Category } from '@/shared/api/categories'
import { fetchParties } from '@/shared/api/parties'
import type { Party } from '@/domains/home/configuration/parties/types'
import { filterPartiesForFilterPanel } from '@/domains/home/transactions/utils/partyAssignment'
import ReportPeriodSection from '@/domains/home/reports/shared/components/ReportPeriodSection'
import ReportWalletSection from '@/domains/home/reports/shared/components/ReportWalletSection'
import type { ParsedReportPeriodState, ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import type { BreakdownDirection } from '@/domains/home/reports/shared/types/breakdown'
import { useSidebarDraftSync } from '@/shared/hooks/useSidebarDraftSync'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import ChartStyleSection from '@/domains/home/reports/shared/components/ChartStyleSection'
import ReportSidebarTabs, {
  useReportSidebarTab,
} from '@/domains/home/reports/shared/components/ReportSidebarTabs'
import { flowFiltersSignature } from '@/domains/home/reports/shared/components/ReportSidebar'
import { isReportPanelOpen } from '@/domains/home/reports/shared/utils/reportPanelUrl'
import LoadedReportBanner from '@/domains/home/reports/shared/components/LoadedReportBanner'
import ReportParamsFooter from '@/domains/home/reports/shared/components/ReportParamsFooter'
import ReportSavedList, { useReportSavedList } from '@/domains/home/reports/shared/components/ReportSavedList'
import ReportSavedFormModal from '@/domains/home/reports/shared/components/ReportSavedFormModal'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import type { ReportSaved } from '@/shared/api/reportSaved'

export interface ReportSavedPanelProps {
  loadedReport: ReportSaved | null
  listRefreshKey: number
  onApplyDraft: () => void
  onCreateReport: (name: string, description: string | null) => Promise<unknown>
  onUpdateReport: () => Promise<unknown>
  onRenameReport: (name: string, description: string | null) => Promise<unknown>
  onSelectReport: (report: ReportSaved) => void
  onDeleteReport: (report: ReportSaved) => Promise<void>
  loadReportList: () => Promise<ReportSaved[]>
}

export interface ReportFiltersPanelContentProps {
  period: ParsedReportPeriodState
  onPeriodModeChange: (mode: ReportPeriodMode) => void
  onPeriodNavigate: (direction: -1 | 1) => void
  onPeriodJumpToCurrent: () => void
  onPeriodRangeChange: (dateFrom: string, dateTo: string) => void
  walletId: string
  onWalletChange: (walletId: string) => void
  activeFilters: FlowFilters
  onApplyFilters: (filters: FlowFilters) => void
  reportDirection?: BreakdownDirection
  chartStyle: ChartStyle
  onChartStyleChange: (style: ChartStyle) => void
  extraSections?: ReactNode
  savedReport?: ReportSavedPanelProps
}

export default function ReportFiltersPanelContent({
  period,
  onPeriodModeChange,
  onPeriodNavigate,
  onPeriodJumpToCurrent,
  onPeriodRangeChange,
  walletId,
  onWalletChange,
  activeFilters,
  onApplyFilters,
  reportDirection,
  chartStyle,
  onChartStyleChange,
  extraSections,
  savedReport,
}: ReportFiltersPanelContentProps) {
  const [searchParams] = useSearchParams()
  const panelOpen = isReportPanelOpen(searchParams)
  const [activeTab, setActiveTab] = useReportSidebarTab(panelOpen)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)

  const appliedFilterDraft = useMemo(() => {
    const { walletId: _, ...filterDraft } = activeFilters
    return filterDraft
  }, [activeFilters])
  const appliedFilterSignature = useMemo(
    () => flowFiltersSignature(activeFilters),
    [activeFilters],
  )
  const [draft, setDraft] = useSidebarDraftSync(panelOpen, appliedFilterDraft, appliedFilterSignature)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [concerns, setConcerns] = useState<Concern[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])

  const listState = useReportSavedList(
    savedReport?.listRefreshKey ?? 0,
    savedReport?.loadReportList ?? (async () => []),
  )

  useEffect(() => {
    if (!panelOpen) return
    Promise.all([fetchWallets(), fetchConcerns(), fetchCategories(), fetchParties()])
      .then(([w, c, cat, p]) => {
        setWallets(w)
        setConcerns(c)
        setCategories(cat)
        setParties(p)
      })
      .catch(() => {})
  }, [panelOpen])

  const { paidFrom: paidFromParties, paidTo: paidToParties } = useMemo(
    () => filterPartiesForFilterPanel(parties),
    [parties],
  )

  const handleFieldChange = useCallback(
    <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }))
    },
    [setDraft],
  )

  const handleApply = useCallback(() => {
    onApplyFilters(draft)
    savedReport?.onApplyDraft()
  }, [draft, onApplyFilters, savedReport])

  const handleUpdateConfirm = useCallback(async () => {
    if (!savedReport) return
    setUpdateLoading(true)
    try {
      onApplyFilters(draft)
      savedReport.onApplyDraft()
      await savedReport.onUpdateReport()
      setUpdateConfirmOpen(false)
    } finally {
      setUpdateLoading(false)
    }
  }, [draft, onApplyFilters, savedReport])

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
        reportDirection={reportDirection}
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

      {savedReport && (
        <>
          <ReportSavedFormModal
            open={createModalOpen}
            title="Utwórz raport"
            submitLabel="Utwórz"
            onClose={() => setCreateModalOpen(false)}
            onSubmit={async ({ name, description }) => {
              onApplyFilters(draft)
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
