export const CHART_PALETTE = [
  '#163526',
  '#c9a96e',
  '#2d6a4f',
  '#d4a574',
  '#40916c',
  '#b08968',
  '#52b788',
  '#e9c46a',
  '#1b4332',
  '#dda15e',
] as const

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
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
