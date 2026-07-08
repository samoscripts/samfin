import { useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Pencil, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import SidePanelShell from '@/shared/components/panel/SidePanelShell'
import SidePanelTabBar from '@/shared/components/panel/SidePanelTabBar'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useSidePanelWidth } from '@/shared/hooks/useSidePanelWidth'
import { NARROW_PANEL_WIDTH } from '@/shared/components/panel/panelLayout'
import { parseTransactionPanelParams } from '@/domains/home/transactions/panel/transactionPanelUrl'
import { useTransactionPanelState } from '@/domains/home/transactions/panel/useTransactionPanelState'
import { REPORT_PANEL_WIDTH_STORAGE_KEY } from '@/domains/home/reports/shared/constants/panelLayout'
import {
  applyReportPanelPatch,
  closeReportPanelParams,
  isReportPanelOpen,
  openReportPanelParams,
  openReportTransactionParams,
  parseReportPanelTab,
  setReportPanelTabParams,
  type ReportPanelTab,
} from '@/domains/home/reports/shared/utils/reportPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

export interface UseReportRightPanelOptions {
  onMutated?: () => void
  filtersContent: ReactNode
  filtersTabLabel?: string
}

export function useReportRightPanel({
  onMutated,
  filtersContent,
  filtersTabLabel = 'Filtry i okres',
}: UseReportRightPanelOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const isMobile = useIsMobile()

  const panelOpen = isReportPanelOpen(searchParams)
  const { tx: urlTxId, tab: urlTab } = parseTransactionPanelParams(searchParams)
  const activeTab = parseReportPanelTab(searchParams)

  const {
    effectivePanelWidth,
    panelExpanded,
    setPanelExpanded,
    toggleExpand,
    onWidthChange,
  } = useSidePanelWidth({
    storageKey: REPORT_PANEL_WIDTH_STORAGE_KEY,
    defaultWidth: NARROW_PANEL_WIDTH,
  })

  useEffect(() => {
    if (panelOpen) setPanelExpanded(false)
  }, [panelOpen, setPanelExpanded])

  const applyPanelUrl = useCallback(
    (patch: Parameters<typeof applyReportPanelPatch>[1]) => {
      applyReportPanelPatch(searchParams, patch, setSearchParams)
    },
    [searchParams, setSearchParams],
  )

  const openPanel = useCallback(() => {
    const next = openReportPanelParams(searchParams)
    if (!searchParamsEqual(searchParams, next)) {
      setSearchParams(next, { replace: true })
    }
    setPanelExpanded(false)
  }, [searchParams, setSearchParams, setPanelExpanded])

  const closePanel = useCallback(() => {
    const next = closeReportPanelParams(searchParams)
    if (!searchParamsEqual(searchParams, next)) {
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const setActiveTab = useCallback(
    (tab: ReportPanelTab) => {
      const next = setReportPanelTabParams(searchParams, tab)
      if (!searchParamsEqual(searchParams, next)) {
        setSearchParams(next, { replace: true })
      }
    },
    [searchParams, setSearchParams],
  )

  const openTx = useCallback(
    (txId: number) => {
      const next = openReportTransactionParams(searchParams, txId, 'details')
      if (!searchParamsEqual(searchParams, next)) {
        setSearchParams(next, { replace: true })
      }
      setPanelExpanded(false)
    },
    [searchParams, setSearchParams, setPanelExpanded],
  )

  const {
    hasTransaction,
    isEditing,
    transactionContent,
    confirmDialogs,
    requestCancelEdit,
  } = useTransactionPanelState({
    urlTxId,
    urlTab,
    onApplyUrl: applyPanelUrl,
    onClose: closePanel,
    onMutated,
  })

  const handleClose = useCallback(() => {
    if (isEditing) {
      requestCancelEdit()
      return
    }
    closePanel()
  }, [isEditing, requestCancelEdit, closePanel])

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (isEditing && tabId === 'filters') {
        requestCancelEdit()
        return
      }
      if (tabId === 'filters') setActiveTab('filters')
      if (tabId === 'details' && urlTxId) setActiveTab('details')
    },
    [setActiveTab, urlTxId, isEditing, requestCancelEdit],
  )

  const tabs = isEditing
    ? [
        {
          id: 'filters',
          label: filtersTabLabel,
          icon: <SlidersHorizontal size={13} />,
        },
        {
          id: 'edit',
          label: 'Edycja',
          icon: <Pencil size={13} />,
        },
      ]
    : [
        {
          id: 'filters',
          label: filtersTabLabel,
          icon: <SlidersHorizontal size={13} />,
        },
        ...(hasTransaction
          ? [
              {
                id: 'details',
                label: 'Szczegóły',
                icon: <FileText size={13} />,
              },
            ]
          : []),
      ]

  const resolvedActiveTab = isEditing ? 'edit' : activeTab

  const panelPortal =
    portalRoot && panelOpen
      ? createPortal(
          <SidePanelShell
            open={panelOpen}
            width={effectivePanelWidth}
            resizable={!panelExpanded}
            onWidthChange={onWidthChange}
            onClose={handleClose}
            backdrop={
              isEditing
                ? { onClick: requestCancelEdit, desktopInset: true }
                : null
            }
          >
            <div className="flex flex-col h-full min-h-0">
              <SidePanelTabBar
                tabs={tabs}
                activeTab={resolvedActiveTab}
                onTabChange={handleTabChange}
                onClose={handleClose}
                expanded={panelExpanded}
                onToggleExpand={toggleExpand}
                showExpand={!isMobile}
              />
              <div className="flex flex-col flex-1 min-h-0">
                {resolvedActiveTab === 'filters' && (
                  <div className="flex flex-col flex-1 min-h-0">{filtersContent}</div>
                )}
                {(resolvedActiveTab === 'details' || resolvedActiveTab === 'edit') &&
                  transactionContent}
              </div>
            </div>
          </SidePanelShell>,
          portalRoot,
        )
      : null

  return {
    panelOpen,
    openPanel,
    closePanel,
    openTx,
    panelPortal,
    confirmDialogs,
  }
}
