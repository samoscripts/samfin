import { parsePositiveInt } from '@/shared/utils/urlQuery'

export type TransactionPanelTab = 'details' | 'edit'

export interface TransactionPanelUrlState {
  tx: number | null
  tab: TransactionPanelTab | null
}

const VALID_TABS = new Set<TransactionPanelTab>(['details', 'edit'])

export function parseTransactionPanelParams(params: URLSearchParams): TransactionPanelUrlState {
  const tabRaw = params.get('tab')
  const tab =
    tabRaw && VALID_TABS.has(tabRaw as TransactionPanelTab)
      ? (tabRaw as TransactionPanelTab)
      : null
  const tx = parsePositiveInt(params.get('tx')) ?? null

  return { tx, tab }
}

export function isTransactionPanelOpen(params: URLSearchParams): boolean {
  const { tx, tab } = parseTransactionPanelParams(params)
  return tx !== null || tab === 'edit'
}

export function mergeTransactionPanelParams(
  params: URLSearchParams,
  patch: Partial<TransactionPanelUrlState>,
): URLSearchParams {
  const next = new URLSearchParams(params)

  if (patch.tx === null) {
    next.delete('tx')
  } else if (patch.tx !== undefined) {
    next.set('tx', String(patch.tx))
  }

  if (patch.tab === null) {
    next.delete('tab')
  } else if (patch.tab !== undefined) {
    next.set('tab', patch.tab)
  }

  if (patch.tx !== undefined && patch.tx !== null) {
    next.delete('panel')
  }

  return next
}

export function clearTransactionPanelParams(params: URLSearchParams): URLSearchParams {
  return mergeTransactionPanelParams(params, { tx: null, tab: null })
}

export function clearReportPeriodPanelParam(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('panel')
  return next
}

/** Which right-panel content wins when multiple URL flags are set. */
export function resolveRightPanelOwner(params: URLSearchParams): 'transaction' | 'period' | null {
  if (isTransactionPanelOpen(params)) return 'transaction'
  if (params.get('panel') === 'period') return 'period'
  return null
}
