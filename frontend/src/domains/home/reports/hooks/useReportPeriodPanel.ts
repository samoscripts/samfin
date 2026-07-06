import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import {
  clearTransactionPanelParams,
  resolveRightPanelOwner,
} from '@/domains/home/transactions/panel'

export function useReportPeriodPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const open = resolveRightPanelOwner(searchParams) === 'period'

  const openPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = clearTransactionPanelParams(new URLSearchParams(prev))
      params.set('panel', 'period')
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

  return { open, openPanel, closePanel, portalRoot }
}
