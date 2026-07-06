export {
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  EXPANDED_PANEL_MAX,
  EXPANDED_PANEL_VW,
  computeExpandedPanelWidth,
  clampPanelWidth,
} from '@/shared/components/panel/panelLayout'

export const PANEL_WIDTH_STORAGE_KEY = 'transactions-panel-width'

import {
  loadStoredPanelWidth as loadShared,
  storePanelWidth as storeShared,
} from '@/shared/components/panel/panelLayout'

export function loadStoredPanelWidth(): number {
  return loadShared(PANEL_WIDTH_STORAGE_KEY)
}

export function storePanelWidth(width: number): void {
  storeShared(PANEL_WIDTH_STORAGE_KEY, width)
}
