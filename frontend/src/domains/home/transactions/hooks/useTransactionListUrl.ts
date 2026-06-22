import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SidebarTab } from '../components/TransactionsSidebar'
import type { FlowFilters, PaginationState, SortState } from '../types'
import type { TransactionNewUrlPrefill } from '../utils/transactionNewUrlParams'
import {
  parseTransactionSearchParams,
  serializeTransactionSearchParams,
  type TransactionUrlState,
} from '../utils/transactionUrlParams'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

type UrlPatch = Partial<TransactionUrlState>

export function useTransactionListUrl() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlState = useMemo(
    () => parseTransactionSearchParams(searchParams),
    [searchParams],
  )

  const applyUrl = useCallback(
    (patch: UrlPatch, options?: { replace?: boolean }) => {
      const next: TransactionUrlState = { ...urlState, ...patch }
      const serialized = serializeTransactionSearchParams(next)
      if (searchParamsEqual(searchParams, serialized)) return
      setSearchParams(serialized, { replace: options?.replace ?? true })
    },
    [searchParams, setSearchParams, urlState],
  )

  const setFilters = useCallback(
    (filters: FlowFilters, options?: { replace?: boolean }) => {
      applyUrl({ filters, pagination: { ...urlState.pagination, page: 1 } }, options)
    },
    [applyUrl, urlState.pagination],
  )

  const setSort = useCallback(
    (sort: SortState) => {
      applyUrl({ sort, pagination: { ...urlState.pagination, page: 1 } })
    },
    [applyUrl, urlState.pagination],
  )

  const setPagination = useCallback(
    (pagination: PaginationState) => {
      applyUrl({ pagination })
    },
    [applyUrl],
  )

  const openTx = useCallback(
    (tx: number, tab: SidebarTab = 'details') => {
      applyUrl({ tx, tab, createPrefill: {} })
    },
    [applyUrl],
  )

  const openFiltersTab = useCallback(() => {
    applyUrl({ tab: 'filters', tx: null, createPrefill: {} })
  }, [applyUrl])

  const openEdit = useCallback(
    (txId: number) => {
      applyUrl({ tx: txId, tab: 'edit', createPrefill: {} })
    },
    [applyUrl],
  )

  const openCreate = useCallback(
    (prefill: TransactionNewUrlPrefill = {}) => {
      applyUrl({ tab: 'create', tx: null, createPrefill: prefill })
    },
    [applyUrl],
  )

  const setTab = useCallback(
    (tab: SidebarTab) => {
      applyUrl({ tab })
    },
    [applyUrl],
  )

  const exitEditMode = useCallback(
    (txId: number | null) => {
      applyUrl({
        tab: txId ? 'details' : 'filters',
        tx: txId,
        createPrefill: {},
      })
    },
    [applyUrl],
  )

  const closePanel = useCallback(() => {
    applyUrl({ tx: null, tab: null, createPrefill: {} })
  }, [applyUrl])

  return {
    ...urlState,
    applyUrl,
    setFilters,
    setSort,
    setPagination,
    openTx,
    openFiltersTab,
    openEdit,
    openCreate,
    setTab,
    exitEditMode,
    closePanel,
  }
}
