import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import type { BreakdownGroup, BreakdownDirection } from '@/domains/home/reports/shared/types/breakdown'
import {
  breakdownGroupChartId,
  CHART_OTHERS_ID,
} from '@/domains/home/reports/shared/utils/chartTopGroups'
import { formatAmount } from '@/shared/utils/format'
import { chartColor } from '@/shared/components/charts/chartColors'

interface BreakdownGroupTransactionsProps {
  group: BreakdownGroup | null
  groupIndex: number
  othersSourceGroups?: BreakdownGroup[]
  direction: BreakdownDirection
  dateFrom: string
  dateTo: string
  onClose: () => void
}

export default function BreakdownGroupTransactions({
  group,
  groupIndex,
  othersSourceGroups = [],
  direction,
  dateFrom,
  dateTo,
  onClose,
}: BreakdownGroupTransactionsProps) {
  if (!group) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-full min-h-[320px] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transakcje</h3>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Kliknij wiersz lub element wykresu, aby zobaczyć transakcje grupy.
          </p>
        </div>
      </div>
    )
  }

  const groupId = breakdownGroupChartId(group)
  const isOthers = groupId === CHART_OTHERS_ID

  const params = new URLSearchParams({ dateFrom, dateTo, direction })
  // Pozycje bez kategorii (group.id === null) linkujemy bez categoryId — lista
  // transakcji nie ma filtra „pozycja bez kategorii” (pełna zgodność w fazie 2).
  if (!isOthers && group.id !== null && group.id > 0) {
    params.set('categoryId', String(group.id))
  }
  const txLink = `/transactions?${params.toString()}`

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-full flex flex-col min-h-[320px]">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span
          className="w-3 h-3 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: chartColor(groupIndex) }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {group.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formatAmount(group.amount)} · {group.itemCount} pozycji ·{' '}
            {group.share.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            {isOthers && othersSourceGroups.length > 0 && (
              <> · {othersSourceGroups.length} grup</>
            )}
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

      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Zobacz transakcje tej grupy na liście operacji z zastosowanymi filtrami okresu i kierunku.
        </p>
        <Link
          to={txLink}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#c9a96e] hover:text-[#d4bc8e] transition-colors"
        >
          Otwórz w wyszukiwarce transakcji <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
