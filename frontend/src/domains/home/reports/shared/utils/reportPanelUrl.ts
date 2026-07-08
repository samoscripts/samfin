import {
  parseTransactionPanelParams,
  type TransactionPanelTab,
} from '@/domains/home/transactions/panel/transactionPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

export const REPORT_PANEL_PARAM = 'filters'

export type ReportPanelTab = 'filters' | 'details' | 'edit'

export function isReportPanelOpen(params: URLSearchParams): boolean {
  return params.get('panel') === REPORT_PANEL_PARAM
}

/** Kopiuje stan panelu bocznego (panel / tx / tab) z bieżącego URL do nowych parametrów. */
export function preserveReportPanelParams(
  source: URLSearchParams,
  target: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(target)
  if (!isReportPanelOpen(source)) return next

  next.set('panel', REPORT_PANEL_PARAM)
  const { tx, tab } = parseTransactionPanelParams(source)
  if (tx !== null) {
    next.set('tx', String(tx))
    if (tab) next.set('tab', tab)
  } else {
    next.delete('tx')
    next.delete('tab')
  }
  return next
}

export function parseReportPanelTab(params: URLSearchParams): ReportPanelTab {
  if (!isReportPanelOpen(params)) return 'filters'
  const { tx, tab } = parseTransactionPanelParams(params)
  if (tab === 'edit' && tx !== null) return 'edit'
  if (tx !== null && tab === 'details') return 'details'
  return 'filters'
}

export function mergeReportPanelParams(
  params: URLSearchParams,
  patch: {
    panelOpen?: boolean
    tx?: number | null
    tab?: TransactionPanelTab | null
  },
): URLSearchParams {
  const next = new URLSearchParams(params)

  if (patch.panelOpen === true) {
    next.set('panel', REPORT_PANEL_PARAM)
  } else if (patch.panelOpen === false) {
    next.delete('panel')
    next.delete('tx')
    next.delete('tab')
    return next
  }

  if (patch.tx === null) {
    next.delete('tx')
    next.delete('tab')
  } else if (patch.tx !== undefined) {
    next.set('tx', String(patch.tx))
    next.set('panel', REPORT_PANEL_PARAM)
  }

  if (patch.tab === null) {
    next.delete('tab')
  } else if (patch.tab !== undefined) {
    next.set('tab', patch.tab)
  }

  return next
}

export function openReportPanelParams(params: URLSearchParams): URLSearchParams {
  return mergeReportPanelParams(params, { panelOpen: true })
}

export function closeReportPanelParams(params: URLSearchParams): URLSearchParams {
  return mergeReportPanelParams(params, { panelOpen: false })
}

export function openReportTransactionParams(
  params: URLSearchParams,
  txId: number,
  tab: TransactionPanelTab = 'details',
): URLSearchParams {
  return mergeReportPanelParams(params, {
    panelOpen: true,
    tx: txId,
    tab,
  })
}

export function setReportPanelTabParams(
  params: URLSearchParams,
  tab: ReportPanelTab,
): URLSearchParams {
  const { tx } = parseTransactionPanelParams(params)
  if (tab === 'filters') {
    return mergeReportPanelParams(params, { tab: null })
  }
  if (tab === 'details' && tx !== null) {
    return mergeReportPanelParams(params, { tab: 'details' })
  }
  if (tab === 'edit' && tx !== null) {
    return mergeReportPanelParams(params, { tab: 'edit' })
  }
  return params
}

export function applyReportPanelPatch(
  current: URLSearchParams,
  patch: Parameters<typeof mergeReportPanelParams>[1],
  setSearchParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void,
): void {
  const next = mergeReportPanelParams(current, patch)
  if (!searchParamsEqual(current, next)) {
    setSearchParams(next, { replace: true })
  }
}
