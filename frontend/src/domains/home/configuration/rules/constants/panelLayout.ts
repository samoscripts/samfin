export {
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  EXPANDED_PANEL_MAX,
  EXPANDED_PANEL_VW,
  computeExpandedPanelWidth,
} from '@/shared/components/panel/panelLayout'

export const PANEL_WIDTH_STORAGE_KEY = 'classification-rules-panel-width'

import {
  loadStoredPanelWidth,
  storePanelWidth,
} from '@/shared/components/panel/panelLayout'

export function loadStoredRulesPanelWidth(): number {
  return loadStoredPanelWidth(PANEL_WIDTH_STORAGE_KEY)
}

export function storeRulesPanelWidth(width: number): void {
  storePanelWidth(PANEL_WIDTH_STORAGE_KEY, width)
}
