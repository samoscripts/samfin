export {
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  EXPANDED_PANEL_MAX,
  EXPANDED_PANEL_VW,
  computeExpandedPanelWidth,
  loadStoredPanelWidth,
  storePanelWidth,
} from '@/domains/home/transactions/constants/panelLayout'

export const PANEL_WIDTH_STORAGE_KEY = 'classification-rules-panel-width'

export function loadStoredRulesPanelWidth(): number {
  if (typeof window === 'undefined') return 640
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
    if (!raw) return 640
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return 640
    return Math.max(400, Math.min(960, n))
  } catch {
    return 640
  }
}

export function storeRulesPanelWidth(width: number): void {
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // ignore
  }
}
