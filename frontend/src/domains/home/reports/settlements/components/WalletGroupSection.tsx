import type { PersonKey, SettlementItemRef, WalletGroupKey, WalletSettlementGroup } from '@/shared/api/settlements'
import {
  OTHER_SECTION_THEME,
  PERSON_THEMES,
  WALLET_GROUP_LABELS,
} from '@/domains/home/reports/settlements/constants'
import { formatAmount } from '@/shared/utils/format'
import ItemsTable from '@/domains/home/reports/settlements/components/ItemsTable'

function BucketSection({
  title,
  total,
  items,
  personKey,
  onOpenTransaction,
}: {
  title: string
  total: number
  items: SettlementItemRef[]
  personKey?: PersonKey
  onOpenTransaction: (transactionId: number) => void
}) {
  const theme = personKey ? PERSON_THEMES[personKey] : null

  return (
    <div
      className={[
        'border rounded-lg p-4 flex flex-col h-full',
        personKey ? theme!.section : 'border-gray-100 dark:border-gray-800',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between mb-3 shrink-0">
        <h4
          className={[
            'text-sm font-medium',
            personKey ? theme!.label : 'text-gray-800 dark:text-gray-200',
          ].join(' ')}
        >
          {title}
        </h4>
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">
          {formatAmount(total)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ItemsTable
          items={items}
          onOpenTransaction={onOpenTransaction}
          emptyMessage="Brak pozycji w wybranym okresie."
        />
      </div>
    </div>
  )
}

export function WalletGroupSection({
  personKey,
  title,
  group,
  informational,
  className,
  onOpenTransaction,
}: {
  personKey: WalletGroupKey
  title: string
  group: WalletSettlementGroup
  informational?: boolean
  className?: string
  onOpenTransaction: (transactionId: number) => void
}) {
  const hasItems = group.expenses.items.length > 0 || group.incomes.items.length > 0
  const isPerson = personKey === 'maciek' || personKey === 'basia'
  const theme = isPerson ? PERSON_THEMES[personKey] : null

  return (
    <div
      className={[
        'rounded-xl p-5 space-y-4 border h-full',
        isPerson ? theme!.section : OTHER_SECTION_THEME,
        className,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3
            className={[
              'text-sm font-semibold',
              isPerson ? theme!.label : 'text-gray-700 dark:text-gray-300',
            ].join(' ')}
          >
            {title}
          </h3>
          {informational && (
            <p className="text-xs text-gray-400 mt-0.5">
              Tylko informacyjnie — nie wpływa na następną wpłatę.
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Saldo netto</p>
          <p
            className={[
              'text-lg font-semibold tabular-nums',
              group.net > 0
                ? 'text-orange-600'
                : group.net < 0
                  ? 'text-emerald-600'
                  : 'text-gray-700 dark:text-gray-300',
            ].join(' ')}
          >
            {formatAmount(group.net)}
          </p>
          <p className="text-xs text-gray-400">
            wydatki {formatAmount(group.expenses.total)} − wpływy {formatAmount(group.incomes.total)}
          </p>
        </div>
      </div>

      {!hasItems ? (
        <p className="text-sm text-gray-400">Brak pozycji w wybranym okresie.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <BucketSection
            title="Wydatki"
            total={group.expenses.total}
            items={group.expenses.items}
            personKey={isPerson ? personKey : undefined}
            onOpenTransaction={onOpenTransaction}
          />
          <BucketSection
            title="Wpływy"
            total={group.incomes.total}
            items={group.incomes.items}
            personKey={isPerson ? personKey : undefined}
            onOpenTransaction={onOpenTransaction}
          />
        </div>
      )}
    </div>
  )
}

export function PairedWalletGroups({
  maciek,
  basia,
  onOpenTransaction,
}: {
  maciek: WalletSettlementGroup
  basia: WalletSettlementGroup
  onOpenTransaction: (transactionId: number) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <WalletGroupSection
        personKey="maciek"
        title={WALLET_GROUP_LABELS.maciek}
        group={maciek}
        onOpenTransaction={onOpenTransaction}
      />
      <WalletGroupSection
        personKey="basia"
        title={WALLET_GROUP_LABELS.basia}
        group={basia}
        onOpenTransaction={onOpenTransaction}
      />
    </div>
  )
}
