export interface FlowFilters {
  dateFrom?: string
  dateTo?: string
  type?: 'EXPENSE' | 'INCOME' | ''
  wallet?: string
  concern?: string
  category?: string
  status?: string
  paidFrom?: string
  paidTo?: string
  tags?: string
  amountMin?: string
  amountMax?: string
}

export type SortField = 'date' | 'amount'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: SortField
  direction: SortDirection
}

export interface PaginationState {
  page: number
  perPage: number
}

export interface PaginationMeta {
  total: number
  page: number
  perPage: number
  lastPage: number
}

export function isFilterActive(filters: FlowFilters): boolean {
  return Object.values(filters).some((v) => v !== '' && v !== undefined)
}

export function countActiveFilters(filters: FlowFilters): number {
  return Object.values(filters).filter((v) => v !== '' && v !== undefined).length
}
