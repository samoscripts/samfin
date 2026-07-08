import type { FlowFilters } from '../types'
import {
  DEFAULT_PAGINATION,
  DEFAULT_SORT,
  serializeTransactionSearchParams,
} from './transactionUrlParams'

export function flowFiltersToTransactionListHref(filters: FlowFilters): string {
  const params = serializeTransactionSearchParams({
    filters,
    sort: DEFAULT_SORT,
    pagination: DEFAULT_PAGINATION,
    tx: null,
    tab: null,
    createPrefill: {},
  })
  return `/transactions?${params.toString()}`
}
