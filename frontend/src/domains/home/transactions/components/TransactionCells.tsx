import { Transaction } from '@/shared/types'
import { WALLET_LABELS, CONCERN_LABELS, resolveLabel } from '../mockData'
import { formatAmount } from '@/shared/utils/format'

export function ItemAmounts({ tx }: { tx: Transaction }) {
  if (tx.items.length === 1) {
    const amt = tx.items[0].amount
    return (
      <span
        className={[
          'font-mono text-sm font-medium',
          amt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
        ].join(' ')}
      >
        {formatAmount(amt, true)}
      </span>
    )
  }
  return (
    <div className="space-y-0.5">
      {tx.items.map((item) => (
        <div
          key={item.id}
          className={[
            'font-mono text-xs font-medium',
            item.amount >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          ].join(' ')}
        >
          {formatAmount(item.amount, true)}
        </div>
      ))}
    </div>
  )
}

type ItemFieldName = 'wallet' | 'concern' | 'category'

export function ItemField({
  items,
  field,
}: {
  items: Transaction['items']
  field: ItemFieldName
}) {
  const map = field === 'wallet' ? WALLET_LABELS : field === 'concern' ? CONCERN_LABELS : {}

  if (items.length === 1) {
    const val = items[0][field]
    return (
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {val ? resolveLabel(map, val) : '—'}
      </span>
    )
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const val = item[field]
        return (
          <div key={item.id} className="text-xs text-gray-600 dark:text-gray-400">
            {val ? resolveLabel(map, val) : '—'}
          </div>
        )
      })}
    </div>
  )
}
