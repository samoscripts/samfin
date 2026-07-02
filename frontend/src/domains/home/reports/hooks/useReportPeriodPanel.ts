import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRightPanelPortal } from '@/layout/RightPanelContext'

export function useReportPeriodPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const open = searchParams.get('panel') === 'period'

  const openPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
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
