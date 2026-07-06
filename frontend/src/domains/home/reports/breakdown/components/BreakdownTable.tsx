import { ChevronRight } from 'lucide-react'
import type { BreakdownGroup, BreakdownGroupBy } from '@/domains/home/reports/shared/types/breakdown'
import {
  breakdownGroupChartId,
  CHART_OTHERS_ID,
} from '@/domains/home/reports/shared/utils/chartTopGroups'
import { formatAmount } from '@/shared/utils/format'

interface BreakdownTableProps {
  groups: BreakdownGroup[]
  groupBy: BreakdownGroupBy
  onRowSelect?: (group: BreakdownGroup) => void
  onDrillDown?: (group: BreakdownGroup) => void
  activeId?: string | null
  embedded?: boolean
}

export default function BreakdownTable({
  groups,
  groupBy,
  onRowSelect,
  onDrillDown,
  activeId,
  embedded = false,
}: BreakdownTableProps) {
  const canDrillDown = groupBy === 'categoryMain'

  const table = (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th className={embedded ? 'px-3 py-2.5 font-medium' : 'px-5 py-3 font-medium'}>Nazwa</th>
              <th className={[embedded ? 'px-3 py-2.5' : 'px-5 py-3', 'font-medium text-right'].join(' ')}>
                Kwota
              </th>
              <th className={[embedded ? 'px-3 py-2.5' : 'px-5 py-3', 'font-medium text-right'].join(' ')}>
                Udział
              </th>
              <th className={[embedded ? 'px-3 py-2.5' : 'px-5 py-3', 'font-medium text-right'].join(' ')}>
                Pozycji
              </th>
              {canDrillDown && <th className="px-3 py-2.5 w-10" />}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const key = breakdownGroupChartId(group)
              const isActive = activeId === key
              const isOthers = key === CHART_OTHERS_ID
              const drillable =
                canDrillDown && group.id !== null && !isOthers && onDrillDown

              return (
                <tr
                  key={key}
                  onClick={onRowSelect ? () => onRowSelect(group) : undefined}
                  className={[
                    'border-b border-gray-50 dark:border-gray-800/80 last:border-0',
                    onRowSelect ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/30' : '',
                    isActive ? 'bg-[#163526]/5 dark:bg-[#c9a96e]/10' : '',
                  ].join(' ')}
                >
                  <td
                    className={[
                      embedded ? 'px-3 py-2.5' : 'px-5 py-3',
                      'font-medium text-gray-900 dark:text-gray-100',
                    ].join(' ')}
                  >
                    {group.name}
                  </td>
                  <td
                    className={[
                      embedded ? 'px-3 py-2.5' : 'px-5 py-3',
                      'text-right tabular-nums text-gray-900 dark:text-gray-100',
                    ].join(' ')}
                  >
                    {formatAmount(group.amount)}
                  </td>
                  <td
                    className={[
                      embedded ? 'px-3 py-2.5' : 'px-5 py-3',
                      'text-right tabular-nums text-gray-500 dark:text-gray-400',
                    ].join(' ')}
                  >
                    {group.share.toLocaleString('pl-PL', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    %
                  </td>
                  <td
                    className={[
                      embedded ? 'px-3 py-2.5' : 'px-5 py-3',
                      'text-right tabular-nums text-gray-500 dark:text-gray-400',
                    ].join(' ')}
                  >
                    {group.itemCount}
                  </td>
                  {canDrillDown && (
                    <td className="px-3 py-2.5 text-gray-300 dark:text-gray-600">
                      {drillable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDrillDown(group)
                          }}
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          aria-label={`Pokaż podkategorie: ${group.name}`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {canDrillDown && (
        <p
          className={[
            embedded ? 'px-1 pt-3' : 'px-5 py-2 border-t border-gray-100 dark:border-gray-800',
            'text-xs text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          Kliknij wiersz, aby zobaczyć transakcje. Strzałka — podkategorie.
        </p>
      )}
    </>
  )

  if (embedded) return table

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tabela</h3>
      </div>
      {table}
    </div>
  )
}
