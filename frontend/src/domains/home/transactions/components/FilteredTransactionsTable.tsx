import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Pagination from '@/shared/components/Pagination'
import { parseTransactionPanelParams } from '../panel/transactionPanelUrl'
import { useFlowsQuery } from '../hooks/useFlowsQuery'
import type { FlowFilters, PaginationState, SortState } from '../types'
import { ItemAmounts } from './TransactionCells'
import TransactionOperationText from './TransactionOperationText'
import { flowFiltersToTransactionListHref } from '../utils/transactionListHref'

const DEFAULT_SORT: SortState = { field: 'date', direction: 'desc' }

interface FilteredTransactionsTableProps {
  filters: FlowFilters
  onOpenTransaction?: (txId: number) => void
  fullListHref?: string
  perPage?: number
  limitNote?: string
}

function filtersSignature(filters: FlowFilters): string {
  return JSON.stringify(filters)
}

export default function FilteredTransactionsTable({
  filters,
  onOpenTransaction,
  fullListHref,
  perPage = 10,
  limitNote,
}: FilteredTransactionsTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, perPage })
  const [hoveredTxId, setHoveredTxId] = useState<number | null>(null)
  const [searchParams] = useSearchParams()
  const selectedTxId = parseTransactionPanelParams(searchParams).tx
  const filtersKey = useMemo(() => filtersSignature(filters), [filters])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [filtersKey, perPage])

  useEffect(() => {
    setHoveredTxId(null)
  }, [selectedTxId, filtersKey])

  const { data, isLoading, isRefreshing, meta } = useFlowsQuery(
    filters,
    DEFAULT_SORT,
    pagination,
  )

  const listHref = fullListHref ?? flowFiltersToTransactionListHref(filters)

  const rowClassName = (txId: number): string => {
    if (!onOpenTransaction) return ''
    const isSelected = selectedTxId === txId
    const isHovered = hoveredTxId === txId
    return [
      'cursor-pointer transition-colors',
      isSelected
        ? 'bg-amber-50/80 dark:bg-amber-950/20'
        : isHovered
          ? 'bg-gray-50 dark:bg-gray-800/40'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
    ].join(' ')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {limitNote && (
        <p className="text-xs text-amber-600 dark:text-amber-400 px-5 py-2 border-b border-gray-100 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20">
          {limitNote}
        </p>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12 text-sm text-gray-400 dark:text-gray-500">
          Ładowanie…
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Brak transakcji dla wybranych filtrów.</p>
        </div>
      ) : (
        <div
          className={[
            'flex-1 min-h-0 overflow-auto transition-opacity',
            isRefreshing ? 'opacity-60' : '',
          ].join(' ')}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                {['Data', 'Opis', 'Kwota'].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.map((tx) => (
                <tr
                  key={tx.transactionId}
                  onClick={onOpenTransaction ? () => onOpenTransaction(tx.transactionId) : undefined}
                  onMouseEnter={
                    onOpenTransaction ? () => setHoveredTxId(tx.transactionId) : undefined
                  }
                  onMouseLeave={onOpenTransaction ? () => setHoveredTxId(null) : undefined}
                  className={rowClassName(tx.transactionId)}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                    {tx.transDate}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 max-w-[200px]">
                    <TransactionOperationText tx={tx} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <ItemAmounts tx={tx} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.total > 0 && (
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-2">
          <Pagination meta={meta} state={pagination} onChange={setPagination} />
        </div>
      )}

      <div className="shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
        <Link
          to={listHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#c9a96e] hover:text-[#d4bc8e] transition-colors"
        >
          Otwórz w wyszukiwarki transakcji <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
