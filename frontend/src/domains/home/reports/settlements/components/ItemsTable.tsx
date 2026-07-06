import type { SettlementItemRef } from '@/shared/api/settlements'
import { formatAmount } from '@/shared/utils/format'

export default function ItemsTable({
  items,
  onOpenTransaction,
  emptyMessage = 'Brak pozycji.',
}: {
  items: SettlementItemRef[]
  onOpenTransaction: (transactionId: number) => void
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <th className="pb-2 pr-3 font-medium">Data</th>
            <th className="pb-2 pr-3 font-medium">Opis</th>
            <th className="pb-2 pr-3 font-medium">Skąd</th>
            <th className="pb-2 pr-3 font-medium">Portfel</th>
            <th className="pb-2 font-medium text-right">Kwota</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.transactionId}-${item.itemId}`}
              className="border-b border-gray-50 dark:border-gray-800/50"
            >
              <td className="py-2 pr-3 whitespace-nowrap">{item.date}</td>
              <td className="py-2 pr-3 min-w-0 max-w-xs truncate">
                <button
                  type="button"
                  onClick={() => onOpenTransaction(item.transactionId)}
                  className="text-[#c9a96e] hover:underline text-left truncate max-w-full"
                  title={item.description ?? undefined}
                >
                  {item.description || `#${item.transactionId}`}
                </button>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{item.paidFrom ?? '—'}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{item.wallet ?? '—'}</td>
              <td className="py-2 text-right tabular-nums">{formatAmount(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
