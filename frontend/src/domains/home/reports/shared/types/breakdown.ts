export type BreakdownGroupBy = 'categoryMain' | 'categorySub' | 'wallet' | 'concern'

export type BreakdownDirection = 'EXPENSE' | 'INCOME'

export interface BreakdownGroup {
  id: number | null
  name: string
  parentId?: number | null
  amount: number
  share: number
  itemCount: number
  children?: BreakdownGroup[]
}

export interface BreakdownReportData {
  dateFrom: string
  dateTo: string
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  total: number
  itemCount: number
  averageAmount: number
  unclassifiedAmount: number
  groups: BreakdownGroup[]
}
