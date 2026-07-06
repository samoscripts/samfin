export const DEFAULT_PANEL_WIDTH = 640
export const MIN_PANEL_WIDTH = 400
export const MAX_PANEL_WIDTH = 960
export const EXPANDED_PANEL_MAX = 1200
export const EXPANDED_PANEL_VW = 0.7

export function computeExpandedPanelWidth(
  max = EXPANDED_PANEL_MAX,
  vw = EXPANDED_PANEL_VW,
): number {
  if (typeof window === 'undefined') return max
  return Math.min(window.innerWidth * vw, max)
}

export function clampPanelWidth(
  width: number,
  min = MIN_PANEL_WIDTH,
  max = MAX_PANEL_WIDTH,
): number {
  return Math.max(min, Math.min(max, width))
}

export function loadStoredPanelWidth(
  storageKey: string,
  defaultWidth = DEFAULT_PANEL_WIDTH,
  min = MIN_PANEL_WIDTH,
  max = MAX_PANEL_WIDTH,
): number {
  if (typeof window === 'undefined') return defaultWidth
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaultWidth
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return defaultWidth
    return clampPanelWidth(n, min, max)
  } catch {
    return defaultWidth
  }
}

export function storePanelWidth(storageKey: string, width: number): void {
  try {
    localStorage.setItem(storageKey, String(width))
  } catch {
    // ignore
  }
}
