export const DEFAULT_PANEL_WIDTH = 640
export const MIN_PANEL_WIDTH = 400
export const MAX_PANEL_WIDTH = 960
export const EXPANDED_PANEL_MAX = 1200
export const EXPANDED_PANEL_VW = 0.7

export const PANEL_WIDTH_STORAGE_KEY = 'transactions-panel-width'

export function computeExpandedPanelWidth(): number {
  if (typeof window === 'undefined') return EXPANDED_PANEL_MAX
  return Math.min(window.innerWidth * EXPANDED_PANEL_VW, EXPANDED_PANEL_MAX)
}

export function loadStoredPanelWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH
  try {
    const raw = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
    if (!raw) return DEFAULT_PANEL_WIDTH
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return DEFAULT_PANEL_WIDTH
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, n))
  } catch {
    return DEFAULT_PANEL_WIDTH
  }
}

export function storePanelWidth(width: number): void {
  try {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // ignore
  }
}
