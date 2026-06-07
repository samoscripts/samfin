import { useMemo } from 'react'
import { MOCK_TRANSACTIONS } from '../mockData'
import { Transaction } from '@/shared/types'
import { FlowFilters, SortState, PaginationState, PaginationMeta } from '../types'

export interface FlowsQueryResult {
  data: Transaction[]
  isLoading: boolean
  meta: PaginationMeta
}

/**
 * Centralne miejsce pobierania operacji.
 *
 * MOCK: filtruje dane lokalne w pamięci.
 *
 * ZAMIANA NA API — wystarczy zastąpić ciało hooka wywołaniem axios:
 *
 *   const [data, setData] = useState<Transaction[]>([])
 *   const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, perPage: 25, lastPage: 1 })
 *   const [isLoading, setIsLoading] = useState(false)
 *   useEffect(() => {
 *     setIsLoading(true)
 *     apiClient.get<{ data: Transaction[]; meta: PaginationMeta }>('/flows', {
 *       params: { ...filters, sortField: sort.field, sortDir: sort.direction, page: pagination.page, perPage: pagination.perPage },
 *     })
 *     .then(r => { setData(r.data.data); setMeta(r.data.meta) })
 *     .finally(() => setIsLoading(false))
 *   }, [filters, sort, pagination])
 *   return { data, isLoading, meta }
 */
export function useFlowsQuery(
  filters: FlowFilters,
  sort: SortState,
  pagination: PaginationState,
): FlowsQueryResult {
  const filtered = useMemo(() => applyFilters(MOCK_TRANSACTIONS, filters), [filters])
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort])
  const total = sorted.length
  const lastPage = Math.max(1, Math.ceil(total / pagination.perPage))
  const page = Math.min(pagination.page, lastPage)
  const data = sorted.slice((page - 1) * pagination.perPage, page * pagination.perPage)

  return {
    data,
    isLoading: false,
    meta: { total, page, perPage: pagination.perPage, lastPage },
  }
}

function applyFilters(txs: Transaction[], f: FlowFilters): Transaction[] {
  return txs.filter((tx) => {
    if (f.dateFrom && tx.date < f.dateFrom) return false
    if (f.dateTo && tx.date > f.dateTo) return false
    if (f.type && tx.direction !== f.type) return false
    if (f.status && tx.status !== f.status) return false
    if (f.paidFrom && tx.paidFrom !== f.paidFrom) return false
    if (f.paidTo && tx.paidTo !== f.paidTo) return false
    if (f.amountMin !== undefined && f.amountMin !== '' && Math.abs(tx.amount) < Number(f.amountMin)) return false
    if (f.amountMax !== undefined && f.amountMax !== '' && Math.abs(tx.amount) > Number(f.amountMax)) return false
    if (f.wallet && !tx.items.some((i) => i.wallet === f.wallet)) return false
    if (f.concern && !tx.items.some((i) => i.concern === f.concern)) return false
    if (f.category && !tx.items.some((i) => i.category === f.category)) return false
    return true
  })
}

function applySort(txs: Transaction[], sort: SortState): Transaction[] {
  return [...txs].sort((a, b) => {
    let cmp = 0
    if (sort.field === 'date') {
      cmp = a.date.localeCompare(b.date)
    } else if (sort.field === 'amount') {
      cmp = Math.abs(a.amount) - Math.abs(b.amount)
    }
    return sort.direction === 'asc' ? cmp : -cmp
  })
}
