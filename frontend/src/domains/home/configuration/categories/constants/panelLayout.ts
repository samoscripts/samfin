export {
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  EXPANDED_PANEL_MAX,
  EXPANDED_PANEL_VW,
  computeExpandedPanelWidth,
} from '@/domains/home/transactions/constants/panelLayout'

export const PANEL_WIDTH_STORAGE_KEY = 'categories-panel-width'

export function loadStoredCategoriesPanelWidth(): number {
  if (typeof window === 'undefined') return 480
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
    if (!raw) return 480
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return 480
    return Math.max(400, Math.min(720, n))
  } catch {
    return 480
  }
}

export function storeCategoriesPanelWidth(width: number): void {
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // ignore
  }
}
