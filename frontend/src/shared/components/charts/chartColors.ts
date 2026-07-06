/** Pastelowa paleta wykresów — miękkie, rozróżnialne odcienie. */
export const CHART_PALETTE = [
  '#a8c5e8',
  '#f0d4a8',
  '#9ed4b8',
  '#e8b4b4',
  '#c9b8e8',
  '#a8e0e8',
  '#f0c4a8',
  '#e8b4d4',
  '#a8e8d8',
  '#d4e8a8',
  '#b4c8e8',
  '#e8c4c4',
  '#d8b8e8',
  '#e8e0a8',
] as const

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

/** Alias — serie porównawcze (opisy, kategorie, portfele, Dotyczy). */
export function chartColorForSeries(index: number): string {
  return chartColor(index)
}

/** Kolory semantyczne kierunku — spójne z UI transakcji. */
export const CHART_INCOME_COLOR = '#059669'
export const CHART_EXPENSE_COLOR = '#dc2626'
export const CHART_BALANCE_COLOR = '#c9a96e'

export function chartColorForDirection(direction: 'INCOME' | 'EXPENSE'): string {
  return direction === 'INCOME' ? CHART_INCOME_COLOR : CHART_EXPENSE_COLOR
}

export function chartThemeColors(effective: 'light' | 'dark') {
  const dark = effective === 'dark'
  return {
    tick: dark ? '#9ca3af' : '#6b7280',
    grid: dark ? '#374151' : '#e5e7eb',
    tooltipBg: dark ? '#111827' : '#ffffff',
    tooltipBorder: dark ? '#374151' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#111827',
  }
}
