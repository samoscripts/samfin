import type { SidebarTab } from '../components/TransactionsSidebar'
import type { FlowFilters, PaginationState, SortState } from '../types'
import {
  buildSearchParams,
  parseCommaList,
  parseOptionalString,
  parsePositiveInt,
  serializeCommaList,
} from '@/shared/utils/urlQuery'
import {
  parseTransactionNewSearchParams,
  type TransactionNewUrlPrefill,
} from './transactionNewUrlParams'

export const DEFAULT_SORT: SortState = { field: 'date', direction: 'desc' }
export const DEFAULT_PAGINATION: PaginationState = { page: 1, perPage: 25 }

export interface TransactionUrlState {
  filters: FlowFilters
  sort: SortState
  pagination: PaginationState
  tx: number | null
  tab: SidebarTab | null
  createPrefill: TransactionNewUrlPrefill
}

const VALID_TABS: SidebarTab[] = ['filters', 'details', 'edit', 'create']
const VALID_SORT_FIELDS: SortState['field'][] = ['date', 'amount']
const VALID_DIRECTIONS = new Set(['EXPENSE', 'INCOME'])

/** Expand month=YYYY-MM to dateFrom/dateTo (inclusive calendar month). */
function expandMonthSugar(month: string): Pick<FlowFilters, 'dateFrom' | 'dateTo'> {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) return {}
  const year = Number(match[1])
  const mon = Number(match[2])
  if (mon < 1 || mon > 12) return {}
  const lastDay = new Date(year, mon, 0).getDate()
  const mm = String(mon).padStart(2, '0')
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

function parseListFilters(params: URLSearchParams, tab: SidebarTab | null): FlowFilters {
  const monthSugar = parseOptionalString(params.get('month'))
  const monthRange = monthSugar ? expandMonthSugar(monthSugar) : {}

  const directions =
    tab === 'create'
      ? undefined
      : (parseCommaList(params.get('direction')).filter((d) =>
          VALID_DIRECTIONS.has(d),
        ) as NonNullable<FlowFilters['directions']>)

  const skipCreateKeys = tab === 'create'

  return {
    ...monthRange,
    dateFrom: parseOptionalString(params.get('dateFrom')) ?? monthRange.dateFrom,
    dateTo: parseOptionalString(params.get('dateTo')) ?? monthRange.dateTo,
    directions: directions && directions.length > 0 ? directions : undefined,
    statuses: parseCommaList(params.get('status')).length
      ? parseCommaList(params.get('status'))
      : undefined,
    paidFromPartyId: skipCreateKeys
      ? undefined
      : parseOptionalString(params.get('paidFromPartyId')),
    paidToPartyId: skipCreateKeys
      ? undefined
      : parseOptionalString(params.get('paidToPartyId')),
    walletId: skipCreateKeys ? undefined : parseOptionalString(params.get('walletId')),
    concernId: skipCreateKeys ? undefined : parseOptionalString(params.get('concernId')),
    categoryId: skipCreateKeys ? undefined : parseOptionalString(params.get('categoryId')),
    amountMin: parseOptionalString(params.get('amountMin')),
    amountMax: parseOptionalString(params.get('amountMax')),
    description: skipCreateKeys ? undefined : parseOptionalString(params.get('description')),
  }
}

export function parseTransactionSearchParams(params: URLSearchParams): TransactionUrlState {
  const tabRaw = params.get('tab')
  const tab =
    tabRaw && VALID_TABS.includes(tabRaw as SidebarTab) ? (tabRaw as SidebarTab) : null

  const filters = parseListFilters(params, tab)

  const sortField = params.get('sortField')
  const sortDir = params.get('sortDir')
  const sort: SortState = {
    field: VALID_SORT_FIELDS.includes(sortField as SortState['field'])
      ? (sortField as SortState['field'])
      : DEFAULT_SORT.field,
    direction:
      sortDir === 'asc' || sortDir === 'desc'
        ? sortDir
        : DEFAULT_SORT.direction,
  }

  const pagination: PaginationState = {
    page: parsePositiveInt(params.get('page')) ?? DEFAULT_PAGINATION.page,
    perPage: parsePositiveInt(params.get('perPage')) ?? DEFAULT_PAGINATION.perPage,
  }

  const tx = tab === 'create' ? null : (parsePositiveInt(params.get('tx')) ?? null)

  const createPrefill = tab === 'create' ? parseTransactionNewSearchParams(params) : {}

  return { filters, sort, pagination, tx, tab, createPrefill }
}

export function serializeTransactionSearchParams(state: TransactionUrlState): URLSearchParams {
  const { filters, sort, pagination, tx, tab, createPrefill } = state

  const month =
    filters.dateFrom &&
    filters.dateTo &&
    !paramsHasOtherDateKeys(filters)
      ? monthFromRange(filters.dateFrom, filters.dateTo)
      : undefined

  const base = buildSearchParams({
    month,
    dateFrom: month ? undefined : filters.dateFrom,
    dateTo: month ? undefined : filters.dateTo,
    status: serializeCommaList(filters.statuses),
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    sortField: sort.field !== DEFAULT_SORT.field ? sort.field : undefined,
    sortDir:
      sort.field !== DEFAULT_SORT.field || sort.direction !== DEFAULT_SORT.direction
        ? sort.direction
        : undefined,
    page: pagination.page !== DEFAULT_PAGINATION.page ? pagination.page : undefined,
    perPage: pagination.perPage !== DEFAULT_PAGINATION.perPage ? pagination.perPage : undefined,
  })

  if (tab === 'create') {
    base.set('tab', 'create')
    const prefillParams = buildSearchParams({
      direction: createPrefill.direction,
      date: createPrefill.date,
      amount: createPrefill.amount,
      description: createPrefill.description,
      paidFromPartyId: createPrefill.paidFromPartyId,
      paidToPartyId: createPrefill.paidToPartyId,
      walletId: createPrefill.walletId,
      concernId: createPrefill.concernId,
      categoryId: createPrefill.categoryId,
    })
    prefillParams.forEach((value, key) => base.set(key, value))
    return base
  }

  const listParams = buildSearchParams({
    direction: serializeCommaList(filters.directions),
    paidFromPartyId: filters.paidFromPartyId,
    paidToPartyId: filters.paidToPartyId,
    walletId: filters.walletId,
    concernId: filters.concernId,
    categoryId: filters.categoryId,
    description: filters.description?.trim() || undefined,
    tx: tx ?? undefined,
    tab: tab ?? undefined,
  })
  listParams.forEach((value, key) => base.set(key, value))
  return base
}

function paramsHasOtherDateKeys(filters: FlowFilters): boolean {
  return Boolean(
    (filters.dateFrom && !filters.dateTo) ||
      (!filters.dateFrom && filters.dateTo),
  )
}

function monthFromRange(dateFrom: string, dateTo: string): string | undefined {
  const fromMatch = /^(\d{4})-(\d{2})-01$/.exec(dateFrom)
  if (!fromMatch) return undefined
  const year = Number(fromMatch[1])
  const mon = Number(fromMatch[2])
  const lastDay = new Date(year, mon, 0).getDate()
  const expectedTo = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return dateTo === expectedTo ? `${year}-${String(mon).padStart(2, '0')}` : undefined
}

export function isPanelOpenFromUrl(state: TransactionUrlState): boolean {
  return state.tx !== null || state.tab !== null
}
