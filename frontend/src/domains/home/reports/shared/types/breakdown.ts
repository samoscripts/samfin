export type BreakdownGroupBy = 'categoryMain' | 'categorySub' | 'wallet' | 'concern'

export type BreakdownDirection = 'EXPENSE' | 'INCOME'

export type BreakdownDirections = BreakdownDirection[]

export interface BreakdownTotals {
  expenses: number
  income: number
  net: number
}

export interface BreakdownGroup {
  id: number | null
  name: string
  parentId?: number | null
  amount: number
  share: number
  itemCount: number
  expenses?: number
  income?: number
  shareIncome?: number
  children?: BreakdownGroup[]
}

export interface BreakdownReportData {
  dateFrom: string | null
  dateTo: string | null
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  directions: BreakdownDirections
  total: number
  itemCount: number
  averageAmount: number
  unclassifiedAmount: number
  totals?: BreakdownTotals
  groups: BreakdownGroup[]
}
