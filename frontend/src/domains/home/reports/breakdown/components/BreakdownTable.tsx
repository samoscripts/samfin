import { ChevronRight } from 'lucide-react'
import type { BreakdownGroup, BreakdownGroupBy } from '@/domains/home/reports/shared/types/breakdown'
import { formatAmount } from '@/shared/utils/format'

interface BreakdownTableProps {
  groups: BreakdownGroup[]
  groupBy: BreakdownGroupBy
  onRowClick?: (group: BreakdownGroup) => void
  activeId?: string | null
}

function groupKey(group: BreakdownGroup): string {
  return group.id === null ? 'null' : String(group.id)
}

export default function BreakdownTable({
  groups,
  groupBy,
  onRowClick,
  activeId,
}: BreakdownTableProps) {
  const canDrillDown = groupBy === 'categoryMain'

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Szczegóły</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th className="px-5 py-3 font-medium">Nazwa</th>
              <th className="px-5 py-3 font-medium text-right">Kwota</th>
              <th className="px-5 py-3 font-medium text-right">Udział</th>
              <th className="px-5 py-3 font-medium text-right">Pozycji</th>
              {canDrillDown && <th className="px-3 py-3 w-8" />}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const key = groupKey(group)
              const isActive = activeId === key
              const clickable = canDrillDown && group.id !== null && onRowClick

              return (
                <tr
                  key={key}
                  onClick={clickable ? () => onRowClick(group) : undefined}
                  className={[
                    'border-b border-gray-50 dark:border-gray-800/80 last:border-0',
                    clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : '',
                    isActive ? 'bg-[#163526]/5 dark:bg-[#c9a96e]/10' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {group.name}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {formatAmount(group.amount)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {group.share.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {group.itemCount}
                  </td>
                  {canDrillDown && (
                    <td className="px-3 py-3 text-gray-300 dark:text-gray-600">
                      {clickable && <ChevronRight size={16} />}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {canDrillDown && (
        <p className="px-5 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
          Kliknij kategorię główną, aby zobaczyć podkategorie.
        </p>
      )}
    </div>
  )
}
