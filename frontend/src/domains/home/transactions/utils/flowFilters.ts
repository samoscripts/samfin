import type { FlowFilters } from '@/domains/home/transactions/types'
import type { TransactionFilters } from '@/shared/api/transactions'

export function flowFiltersToTransactionFilters(filters: FlowFilters): TransactionFilters {
  const result: TransactionFilters = {}
  if (filters.dateFrom) result.dateFrom = filters.dateFrom
  if (filters.dateTo) result.dateTo = filters.dateTo
  if (filters.directions?.length) result.direction = filters.directions.join(',')
  if (filters.statuses?.length) result.status = filters.statuses.join(',')
  if (filters.paidFromPartyId) result.paidFromPartyId = filters.paidFromPartyId
  if (filters.paidToPartyId) result.paidToPartyId = filters.paidToPartyId
  if (filters.walletId) result.walletId = filters.walletId
  if (filters.concernId) result.concernId = filters.concernId
  if (filters.categoryId) result.categoryId = filters.categoryId
  if (filters.amountMin) result.amountMin = filters.amountMin
  if (filters.amountMax) result.amountMax = filters.amountMax
  if (filters.description?.trim()) result.description = filters.description.trim()
  return result
}
