import { useCallback, useEffect, useState } from 'react'
import type { TransactionFilterSaved } from '@/shared/api/transactionFilterSaved'
import {
  createTransactionFilterSaved,
  deleteTransactionFilterSaved,
  fetchTransactionFilterSavedList,
  updateTransactionFilterSaved,
} from '@/shared/api/transactionFilterSaved'
import {
  applyTransactionFilterParams,
  captureTransactionFilterParams,
  FILTER_SAVED_ID_PARAM,
} from '../utils/transactionFilterSavedParams'
import type { FlowFilters, PaginationState, SortState } from '../types'
import { getApiErrorMessage } from '@/shared/utils/errors'

interface UseTransactionFilterSavedOptions {
  filterSavedId: number | null
  setSearchParams: (
    fn: (prev: URLSearchParams) => URLSearchParams,
    options?: { replace?: boolean },
  ) => void
  applySavedState: (patch: {
    filters: FlowFilters
    sort: SortState
    pagination: PaginationState
    filterSavedId: number | null
  }) => void
  getCaptureState: () => { filters: FlowFilters; sort: SortState; perPage: number }
  onSelectApplied?: () => void
}

export function useTransactionFilterSaved({
  filterSavedId,
  setSearchParams,
  applySavedState,
  getCaptureState,
  onSelectApplied,
}: UseTransactionFilterSavedOptions) {
  const [loadedFilter, setLoadedFilter] = useState<TransactionFilterSaved | null>(null)
  const [listRefreshKey, setListRefreshKey] = useState(0)

  useEffect(() => {
    if (!filterSavedId) {
      setLoadedFilter(null)
      return
    }

    let cancelled = false
    void fetchTransactionFilterSavedList()
      .then((list) => {
        if (cancelled) return
        const found = list.find((item) => item.id === filterSavedId) ?? null
        setLoadedFilter(found)
      })
      .catch(() => {
        if (!cancelled) setLoadedFilter(null)
      })

    return () => {
      cancelled = true
    }
  }, [filterSavedId, listRefreshKey])

  const setFilterSavedId = useCallback(
    (id: number | null) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (id === null) params.delete(FILTER_SAVED_ID_PARAM)
        else params.set(FILTER_SAVED_ID_PARAM, String(id))
        return params
      }, { replace: true })
    },
    [setSearchParams],
  )

  const createFilter = useCallback(
    async (name: string, description: string | null, filtersOverride?: FlowFilters) => {
      const { sort, perPage } = getCaptureState()
      const filters = filtersOverride ?? getCaptureState().filters
      const params = captureTransactionFilterParams(filters, sort, perPage) as unknown as Record<string, unknown>
      const created = await createTransactionFilterSaved({
        name,
        description,
        params,
      })
      setFilterSavedId(created.id)
      setLoadedFilter(created)
      setListRefreshKey((k) => k + 1)
      return created
    },
    [getCaptureState, setFilterSavedId],
  )

  const updateFilter = useCallback(async (filtersOverride?: FlowFilters) => {
    if (!loadedFilter) return
    const { sort, perPage } = getCaptureState()
    const filters = filtersOverride ?? getCaptureState().filters
    const params = captureTransactionFilterParams(filters, sort, perPage) as unknown as Record<string, unknown>
    const updated = await updateTransactionFilterSaved(loadedFilter.id, { params })
    setLoadedFilter(updated)
    setListRefreshKey((k) => k + 1)
    return updated
  }, [getCaptureState, loadedFilter])

  const renameFilter = useCallback(
    async (name: string, description: string | null) => {
      if (!loadedFilter) return
      const updated = await updateTransactionFilterSaved(loadedFilter.id, { name, description })
      setLoadedFilter(updated)
      setListRefreshKey((k) => k + 1)
      return updated
    },
    [loadedFilter],
  )

  const deleteFilter = useCallback(
    async (filter: TransactionFilterSaved) => {
      await deleteTransactionFilterSaved(filter.id)
      if (loadedFilter?.id === filter.id) {
        setFilterSavedId(null)
      }
      setListRefreshKey((k) => k + 1)
    },
    [loadedFilter?.id, setFilterSavedId],
  )

  const selectFilter = useCallback(
    (filter: TransactionFilterSaved) => {
      const applied = applyTransactionFilterParams(filter.params)
      applySavedState({
        filters: applied.filters,
        sort: applied.sort,
        pagination: { page: 1, perPage: applied.perPage },
        filterSavedId: filter.id,
      })
      setLoadedFilter(filter)
      onSelectApplied?.()
    },
    [applySavedState, onSelectApplied],
  )

  return {
    loadedFilter,
    listRefreshKey,
    createFilter,
    updateFilter,
    renameFilter,
    deleteFilter,
    selectFilter,
    loadList: () => fetchTransactionFilterSavedList(),
    listErrorMessage: (err: unknown, fallback: string) => getApiErrorMessage(err, fallback),
  }
}
