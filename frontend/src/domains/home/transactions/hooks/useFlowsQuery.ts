import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchTransactions } from '@/shared/api/transactions'
import type { Transaction } from '@/shared/types'
import type { FlowFilters, SortState, PaginationState, PaginationMeta } from '../types'
import { flowFiltersToTransactionFilters } from '../utils/flowFilters'
import { serializeCommaList } from '@/shared/utils/urlQuery'

export interface FlowsQueryResult {
  data: Transaction[]
  /** True only while fetching and there is no data to show yet. */
  isLoading: boolean
  /** True when re-fetching while previous data is still visible. */
  isRefreshing: boolean
  meta: PaginationMeta
}

const DEFAULT_META: PaginationMeta = { total: 0, page: 1, perPage: 25, lastPage: 1 }

function filtersQueryKey(filters: FlowFilters): string {
  return [
    filters.dateFrom ?? '',
    filters.dateTo ?? '',
    serializeCommaList(filters.directions) ?? '',
    serializeCommaList(filters.statuses) ?? '',
    filters.paidFromPartyId ?? '',
    filters.paidToPartyId ?? '',
    filters.walletId ?? '',
    filters.concernId ?? '',
    filters.categoryId ?? '',
    filters.amountMin ?? '',
    filters.amountMax ?? '',
    filters.description ?? '',
  ].join('\0')
}

export function useFlowsQuery(
  filters: FlowFilters,
  sort: SortState,
  pagination: PaginationState,
  refreshKey = 0,
): FlowsQueryResult {
  const [data, setData]         = useState<Transaction[]>([])
  const [meta, setMeta]         = useState<PaginationMeta>(DEFAULT_META)
  const [isFetching, setFetching] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const filtersKey = useMemo(() => filtersQueryKey(filters), [filters])

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFetching(true)

    fetchTransactions(
      flowFiltersToTransactionFilters(filters),
      sort.field,
      sort.direction,
      pagination.page,
      pagination.perPage,
    )
      .then((res) => {
        if (controller.signal.aborted) return
        setData(res.data)
        setMeta(res.meta)
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || controller.signal.aborted) return
        console.error('useFlowsQuery error', err)
        setData([])
        setMeta(DEFAULT_META)
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false)
      })

    return () => controller.abort()
  }, [
    filtersKey,
    sort.field,
    sort.direction,
    pagination.page,
    pagination.perPage,
    refreshKey,
  ])

  const isLoading = isFetching && data.length === 0
  const isRefreshing = isFetching && data.length > 0

  return { data, isLoading, isRefreshing, meta }
}
