import { useMemo } from 'react'
import { X } from 'lucide-react'
import type { TrendBarSelection, TrendQueryState } from '@/domains/home/reports/trend/types/trend'
import {
  trendSelectionToFlowFilters,
  trendTransactionsLink,
} from '@/domains/home/reports/trend/utils/trendUrl'
import { FilteredTransactionsTable } from '@/domains/home/transactions/list'
import { chartColor } from '@/shared/components/charts/chartColors'
import { formatAmount } from '@/shared/utils/format'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

interface TrendPeriodTransactionsProps {
  selection: TrendBarSelection | null
  query: TrendQueryState
  onOpenTransaction?: (txId: number) => void
  onClose: () => void
}

export default function TrendPeriodTransactions({
  selection,
  query,
  onOpenTransaction,
  onClose,
}: TrendPeriodTransactionsProps) {
  const flowFilters = useMemo(
    () => (selection ? trendSelectionToFlowFilters(selection, query) : null),
    [selection, query],
  )
  const txLink = selection ? trendTransactionsLink(selection, query) : ''

  if (!selection || !flowFilters) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col min-h-[200px]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transakcje</h3>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Kliknij słupek na wykresie, aby zobaczyć transakcje z wybranego okresu i serii.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col min-h-[200px]">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span
          className="w-3 h-3 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: chartColor(selection.colorIndex) }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {selection.periodLabel} · {selection.seriesName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {DIRECTION_LABEL_BY_VALUE[selection.direction]} · {formatAmount(selection.amount)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          aria-label="Zamknij podgląd transakcji"
        >
          <X size={14} />
        </button>
      </div>

      <FilteredTransactionsTable
        filters={flowFilters}
        onOpenTransaction={onOpenTransaction}
        fullListHref={txLink}
      />
    </div>
  )
}
