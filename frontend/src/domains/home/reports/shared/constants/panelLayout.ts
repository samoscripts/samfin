export { NARROW_PANEL_WIDTH } from '@/shared/components/panel/panelLayout'

export const REPORT_PANEL_WIDTH_STORAGE_KEY = 'reports-panel-width'

import {
  loadStoredPanelWidth as loadShared,
  storePanelWidth as storeShared,
  NARROW_PANEL_WIDTH,
} from '@/shared/components/panel/panelLayout'

export function loadReportPanelWidth(): number {
  return loadShared(REPORT_PANEL_WIDTH_STORAGE_KEY, NARROW_PANEL_WIDTH)
}

export function storeReportPanelWidth(width: number): void {
  storeShared(REPORT_PANEL_WIDTH_STORAGE_KEY, width)
}
