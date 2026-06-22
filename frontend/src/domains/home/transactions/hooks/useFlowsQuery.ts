import { useState, useEffect, useRef } from 'react'
import { fetchTransactions } from '@/shared/api/transactions'
import type { Transaction } from '@/shared/types'
import type { FlowFilters, SortState, PaginationState, PaginationMeta } from '../types'
import { flowFiltersToTransactionFilters } from '../utils/flowFilters'

export interface FlowsQueryResult {
  data: Transaction[]
  isLoading: boolean
  meta: PaginationMeta
}

const DEFAULT_META: PaginationMeta = { total: 0, page: 1, perPage: 25, lastPage: 1 }

export function useFlowsQuery(
  filters: FlowFilters,
  sort: SortState,
  pagination: PaginationState,
  refreshKey = 0,
): FlowsQueryResult {
  const [data, setData]         = useState<Transaction[]>([])
  const [meta, setMeta]         = useState<PaginationMeta>(DEFAULT_META)
  const [isLoading, setLoading] = useState(false)

  // Abort controller ref to cancel in-flight requests on new calls
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

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
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.directions,
    filters.statuses,
    filters.paidFromPartyId,
    filters.paidToPartyId,
    filters.walletId,
    filters.concernId,
    filters.categoryId,
    filters.amountMin,
    filters.amountMax,
    filters.description,
    sort.field,
    sort.direction,
    pagination.page,
    pagination.perPage,
    refreshKey,
  ])

  return { data, isLoading, meta }
}
