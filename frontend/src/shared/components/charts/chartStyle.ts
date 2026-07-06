import {
  CHART_PALETTE_IDS,
  CHART_PALETTES,
  type ChartPaletteId,
} from '@/shared/components/charts/chartPalettes'

export type ChartStyle = ChartPaletteId

export const CHART_STYLE_STORAGE_KEY = 'fin.chartStyle'

export const DEFAULT_CHART_STYLE: ChartStyle = 'rainbow'

export const CHART_STYLE_URL_PARAM = 'chartStyle'

const VALID_CHART_STYLES = new Set<string>(CHART_PALETTE_IDS)

/** Mapowanie starych wartości z localStorage / URL. */
const LEGACY_CHART_STYLE: Record<string, ChartStyle> = {
  directionTint: 'forest',
  directionSolid: 'forest',
  sage: 'spring',
  ocean: 'cool',
  coral: 'warm',
  sunset: 'autumn',
  lavender: 'vivid',
  midnight: 'graphite',
  berry: 'vivid',
}

export const CHART_STYLE_OPTIONS: { id: ChartStyle; label: string; description: string }[] =
  CHART_PALETTE_IDS.map((id) => ({
    id,
    label: CHART_PALETTES[id].label,
    description: CHART_PALETTES[id].description,
  }))

export function parseChartStyle(raw: string | null): ChartStyle {
  if (raw && LEGACY_CHART_STYLE[raw]) return LEGACY_CHART_STYLE[raw]
  if (raw && VALID_CHART_STYLES.has(raw)) return raw as ChartStyle
  return DEFAULT_CHART_STYLE
}

export function readStoredChartStyle(): ChartStyle {
  try {
    const raw = localStorage.getItem(CHART_STYLE_STORAGE_KEY)
    return parseChartStyle(raw)
  } catch {
    return DEFAULT_CHART_STYLE
  }
}

export function writeStoredChartStyle(style: ChartStyle): void {
  try {
    localStorage.setItem(CHART_STYLE_STORAGE_KEY, style)
  } catch {
    // ignore quota / private mode
  }
}
