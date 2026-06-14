import type { FlowFilters } from '@/domains/home/transactions/types'
import type { TransactionFilters } from '@/shared/api/transactions'

export function flowFiltersToTransactionFilters(filters: FlowFilters): TransactionFilters {
  const result: TransactionFilters = {}
  if (filters.dateFrom) result.dateFrom = filters.dateFrom
  if (filters.dateTo) result.dateTo = filters.dateTo
  if (filters.direction) result.direction = filters.direction
  if (filters.status) result.status = filters.status
  if (filters.paidFromPartyId) result.paidFromPartyId = filters.paidFromPartyId
  if (filters.paidToPartyId) result.paidToPartyId = filters.paidToPartyId
  if (filters.walletId) result.walletId = filters.walletId
  if (filters.concernId) result.concernId = filters.concernId
  if (filters.categoryId) result.categoryId = filters.categoryId
  if (filters.amountMin) result.amountMin = filters.amountMin
  if (filters.amountMax) result.amountMax = filters.amountMax
  return result
}
