import type { PersonKey, SettlementItemRef } from '@/shared/api/settlements'
import { PERSON_THEMES, personSectionClasses } from '@/domains/home/reports/settlements/constants'
import { formatAmount } from '@/shared/utils/format'
import ItemsTable from '@/domains/home/reports/settlements/components/ItemsTable'
import RotationAnchorBadge from '@/domains/home/reports/settlements/components/RotationAnchorBadge'

export default function StandardDepositsSection({
  person,
  title,
  total,
  items,
  isAnchor,
  className,
  onOpenTransaction,
  emptyMessage,
}: {
  person: PersonKey
  title: string
  total: number
  items: SettlementItemRef[]
  isAnchor: boolean
  className?: string
  onOpenTransaction: (transactionId: number) => void
  emptyMessage?: string
}) {
  const theme = PERSON_THEMES[person]

  return (
    <div
      className={[
        'border rounded-xl p-5 flex flex-col',
        personSectionClasses(person, { variant: 'section' }),
        className,
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className={['text-sm font-semibold', theme.label].join(' ')}>{title}</h3>
          {isAnchor && <RotationAnchorBadge person={person} size="sm" animated={false} />}
        </div>
        <span className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300 shrink-0">
          {formatAmount(total)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ItemsTable
          items={items}
          onOpenTransaction={onOpenTransaction}
          emptyMessage={emptyMessage ?? 'Brak wpłat w wybranym okresie.'}
        />
      </div>
    </div>
  )
}
