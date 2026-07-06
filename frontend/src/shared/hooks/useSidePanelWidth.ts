import { useCallback, useState } from 'react'
import {
  clampPanelWidth,
  computeExpandedPanelWidth,
  DEFAULT_PANEL_WIDTH,
  loadStoredPanelWidth,
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  storePanelWidth,
} from '@/shared/components/panel/panelLayout'

export interface UseSidePanelWidthOptions {
  storageKey: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

export function useSidePanelWidth({
  storageKey,
  defaultWidth = DEFAULT_PANEL_WIDTH,
  minWidth = MIN_PANEL_WIDTH,
  maxWidth = MAX_PANEL_WIDTH,
}: UseSidePanelWidthOptions) {
  const [panelWidth, setPanelWidthState] = useState(() =>
    loadStoredPanelWidth(storageKey, defaultWidth, minWidth, maxWidth),
  )
  const [panelExpanded, setPanelExpanded] = useState(false)

  const effectivePanelWidth = panelExpanded
    ? computeExpandedPanelWidth()
    : panelWidth

  const onWidthChange = useCallback(
    (width: number) => {
      const clamped = clampPanelWidth(width, minWidth, maxWidth)
      setPanelWidthState(clamped)
      storePanelWidth(storageKey, clamped)
    },
    [storageKey, minWidth, maxWidth],
  )

  const toggleExpand = useCallback(() => {
    setPanelExpanded((v) => !v)
  }, [])

  return {
    panelWidth,
    effectivePanelWidth,
    panelExpanded,
    setPanelExpanded,
    onWidthChange,
    toggleExpand,
    minWidth,
    maxWidth,
  }
}
