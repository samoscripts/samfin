export type ChartDirection = 'EXPENSE' | 'INCOME'

export type ChartDirectionList = ChartDirection[]

export interface DirectionChartSelection {
  id: string
  direction: ChartDirection
  amount: number
  label: string
}

/** Punkt z wartościami per kierunek (kategoria, okres lub seria). */
export interface DirectionValuePoint {
  id: string
  label: string
  expenses: number
  income: number
  colorIndex: number
}

/** Wiersz gotowy do Recharts (słupki, area, diverging). */
export interface DirectionChartRow {
  id: string
  label: string
  expenses: number
  income: number
  net: number
  colorIndex: number
}

export interface DirectionBarSeriesDef {
  dataKey: string
  direction: ChartDirection
  name: string
  colorIndex: number
  stackId?: string
}

export interface HeatmapColumn {
  id: string
  label: string
}

export interface HeatmapRow {
  id: string
  label: string
  colorIndex: number
}

export interface HeatmapCellData {
  rowId: string
  columnId: string
  value: number
}

export function directionChartCellId(rowId: string, direction: ChartDirection): string {
  return `${rowId}::${direction}`
}

export function parseDirectionChartCellId(cellId: string): { rowId: string; direction: ChartDirection } | null {
  const sep = cellId.lastIndexOf('::')
  if (sep < 0) return null
  const rowId = cellId.slice(0, sep)
  const direction = cellId.slice(sep + 2)
  if (direction !== 'EXPENSE' && direction !== 'INCOME') return null
  return { rowId, direction }
}
