import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Pencil, FileText } from 'lucide-react'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import SidePanelShell from '@/shared/components/panel/SidePanelShell'
import SidePanelTabBar from '@/shared/components/panel/SidePanelTabBar'
import { useSidePanelWidth } from '@/shared/hooks/useSidePanelWidth'
import { PANEL_WIDTH_STORAGE_KEY } from '../constants/panelLayout'
import {
  clearTransactionPanelParams,
  mergeTransactionPanelParams,
  parseTransactionPanelParams,
  type TransactionPanelTab,
} from './transactionPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'
import { useTransactionPanelState } from './useTransactionPanelState'

export interface UseTransactionPanelOptions {
  onMutated?: () => void
}

export function useTransactionPanel({ onMutated }: UseTransactionPanelOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const isMobile = useIsMobile()

  const { tx: urlTxId, tab: urlTab } = parseTransactionPanelParams(searchParams)
  const panelOpen = urlTxId !== null

  const {
    effectivePanelWidth,
    panelExpanded,
    toggleExpand,
    onWidthChange,
  } = useSidePanelWidth({ storageKey: PANEL_WIDTH_STORAGE_KEY })

  const applyPanelUrl = useCallback(
    (patch: { tx?: number | null; tab?: TransactionPanelTab | null }) => {
      const next = mergeTransactionPanelParams(searchParams, patch)
      if (searchParamsEqual(searchParams, next)) return
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const closePanel = useCallback(() => {
    const next = clearTransactionPanelParams(searchParams)
    if (searchParamsEqual(searchParams, next)) return
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const {
    isEditing,
    activeTab,
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

  const openTx = useCallback(
    (txId: number, tab: TransactionPanelTab = 'details') => {
      applyPanelUrl({ tx: txId, tab })
    },
    [applyPanelUrl],
  )

  const openEdit = useCallback(
    (txId: number) => {
      applyPanelUrl({ tx: txId, tab: 'edit' })
    },
    [applyPanelUrl],
  )

  const handleClose = useCallback(() => {
    if (isEditing) {
      requestCancelEdit()
      return
    }
    closePanel()
  }, [isEditing, requestCancelEdit, closePanel])

  const tabs = isEditing
    ? [{ id: 'edit', label: 'Edycja', icon: <Pencil size={13} /> }]
    : [
        {
          id: 'details',
          label: 'Szczegóły',
          icon: <FileText size={13} />,
        },
      ]

  const transactionPanelPortal =
    portalRoot && panelOpen
      ? createPortal(
          <SidePanelShell
            key={urlTxId ?? 'closed'}
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
                activeTab={activeTab}
                onTabChange={() => {}}
                onClose={handleClose}
                expanded={panelExpanded}
                onToggleExpand={toggleExpand}
                showExpand={!isMobile}
              />
              <div className="flex flex-col flex-1 min-h-0">{transactionContent}</div>
            </div>
          </SidePanelShell>,
          portalRoot,
        )
      : null

  return {
    openTx,
    openEdit,
    closePanel,
    panelOpen,
    transactionPanelPortal,
    confirmDialogs,
  }
}
