export interface FlowFilters {
  dateFrom?: string
  dateTo?: string
  directions?: ('EXPENSE' | 'INCOME')[]
  paidFromPartyId?: string
  paidToPartyId?: string
  walletId?: string
  concernId?: string
  categoryId?: string
  statuses?: string[]
  amountMin?: string
  amountMax?: string
  description?: string
}

export function isFilterValueActive(value: FlowFilters[keyof FlowFilters]): boolean {
  if (value === '' || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  return true
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
  return Object.values(filters).some(isFilterValueActive)
}

export function countActiveFilters(filters: FlowFilters): number {
  return Object.values(filters).filter(isFilterValueActive).length
}
