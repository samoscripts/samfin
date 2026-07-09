import type { FlowFilters, SortState } from '../types'
import { isFilterValueActive } from '../types'
import { DEFAULT_PAGINATION, DEFAULT_SORT } from './transactionUrlParams'

export const FILTER_SAVED_ID_PARAM = 'filterSavedId'

export interface TransactionFilterSavedParams {
  filters: FlowFilters
  sort: SortState
  perPage: number
}

function normalizeFlowFilters(filters: FlowFilters): FlowFilters {
  const out: FlowFilters = {}
  for (const [key, value] of Object.entries(filters)) {
    if (isFilterValueActive(value as FlowFilters[keyof FlowFilters])) {
      ;(out as Record<string, unknown>)[key] = value
    }
  }
  return out
}

export function captureTransactionFilterParams(
  filters: FlowFilters,
  sort: SortState,
  perPage: number,
): TransactionFilterSavedParams {
  return {
    filters: normalizeFlowFilters(filters),
    sort: {
      field: sort.field,
      direction: sort.direction,
    },
    perPage,
  }
}

function parseStoredFilters(raw: unknown): FlowFilters {
  if (!raw || typeof raw !== 'object') return {}

  const data = raw as Record<string, unknown>
  const filters: FlowFilters = {}

  if (Array.isArray(data.directions)) {
    const directions = data.directions.filter((d): d is 'EXPENSE' | 'INCOME' => d === 'EXPENSE' || d === 'INCOME')
    if (directions.length > 0) filters.directions = directions
  }

  if (Array.isArray(data.statuses)) {
    const statuses = data.statuses.filter((s): s is string => typeof s === 'string' && s !== '')
    if (statuses.length > 0) filters.statuses = statuses
  }

  const stringKeys: (keyof FlowFilters)[] = [
    'dateFrom',
    'dateTo',
    'paidFromPartyId',
    'paidToPartyId',
    'walletId',
    'concernId',
    'categoryId',
    'amountMin',
    'amountMax',
    'description',
  ]

  for (const key of stringKeys) {
    const value = data[key]
    if (typeof value === 'string' && value !== '') {
      ;(filters as Record<string, string>)[key] = value
    }
  }

  return normalizeFlowFilters(filters)
}

function parseStoredSort(raw: unknown): SortState {
  if (!raw || typeof raw !== 'object') return DEFAULT_SORT

  const data = raw as Record<string, unknown>
  const field = data.field === 'amount' ? 'amount' : 'date'
  const direction = data.direction === 'asc' ? 'asc' : 'desc'

  return { field, direction }
}

export function applyTransactionFilterParams(
  params: Record<string, unknown>,
): Pick<TransactionFilterSavedParams, 'filters' | 'sort' | 'perPage'> {
  const filters = parseStoredFilters(params.filters)
  const sort = parseStoredSort(params.sort)

  const perPageRaw = params.perPage
  const perPage =
    typeof perPageRaw === 'number' && Number.isInteger(perPageRaw) && perPageRaw > 0
      ? perPageRaw
      : DEFAULT_PAGINATION.perPage

  return { filters, sort, perPage }
}

export function parseFilterSavedId(params: URLSearchParams): number | null {
  const raw = params.get(FILTER_SAVED_ID_PARAM)
  if (!raw) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function setFilterSavedIdParam(params: URLSearchParams, id: number | null): void {
  if (id === null) params.delete(FILTER_SAVED_ID_PARAM)
  else params.set(FILTER_SAVED_ID_PARAM, String(id))
}
