import { Link } from 'react-router-dom'
import { Wallet, RefreshCw, AlertTriangle } from 'lucide-react'
import type { PersonKey, SettlementPersonOutlook, WalletSettlementGroup } from '@/shared/api/settlements'
import { useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'
import {
  PERSON_LABELS,
  PERSON_THEMES,
  SETTLEMENT_UI_LABELS,
  WALLET_GROUP_LABELS,
  personSectionClasses,
} from '@/domains/home/reports/settlements/constants'
import StatCard from '@/domains/home/reports/settlements/components/StatCard'
import RotationFormulaBreakdown from '@/domains/home/reports/settlements/components/RotationFormulaBreakdown'
import { aggregateItemsByWallet } from '@/domains/home/reports/settlements/utils/walletAggregation'
import { formatAmount } from '@/shared/utils/format'

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RotationSummaryCard({
  person,
  outlook,
  bankDepositsTotal,
  ownContributionsTotal,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
  bankDepositsTotal: number
  ownContributionsTotal: number
}) {
  const sim = outlook.afterAnchorDepositSimulation
  const label = outlook.isAnchor
    ? `Wpłata rotacyjna — ${PERSON_LABELS[person]}`
    : `Podgląd — ${PERSON_LABELS[person]}`

  const mainAmount = sim ? sim.suggestedAmount : outlook.suggestedAmount

  const subParts = outlook.isAnchor
    ? [
        `${SETTLEMENT_UI_LABELS.bankDepositsInPeriod}: ${formatAmount(bankDepositsTotal)}`,
        `${SETTLEMENT_UI_LABELS.ownContributionsInPeriod}: ${formatAmount(ownContributionsTotal)}`,
      ]
    : sim
      ? [
          SETTLEMENT_UI_LABELS.simulationAfterAnchor(
            PERSON_LABELS[sim.anchorPerson],
            formatAmount(sim.anchorPaidAmount),
          ),
          SETTLEMENT_UI_LABELS.walletDebtNow(formatAmount(outlook.suggestedAmount)),
        ]
      : [
          `${SETTLEMENT_UI_LABELS.bankDepositsInPeriod}: ${formatAmount(bankDepositsTotal)}`,
          `${SETTLEMENT_UI_LABELS.ownContributionsInPeriod}: ${formatAmount(ownContributionsTotal)}`,
        ]

  return (
    <StatCard
      person={person}
      label={label}
      value={formatAmount(mainAmount)}
      sub={subParts.join(' · ')}
      icon={<Wallet size={18} />}
      queueActive={outlook.isAnchor}
    />
  )
}

function PersonWalletColumn({
  person,
  outlook,
  walletGroup,
  rows,
  walletNames,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
  walletGroup: WalletSettlementGroup
  rows: ReturnType<typeof aggregateItemsByWallet>
  walletNames: Map<number, string>
}) {
  const theme = PERSON_THEMES[person]

  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col gap-4 h-full',
        personSectionClasses(person, { variant: 'section' }),
      ].join(' ')}
    >
      <div>
        <p className={['text-sm font-semibold', theme.label].join(' ')}>{PERSON_LABELS[person]}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {SETTLEMENT_UI_LABELS.walletCumulativeBalance}
        </p>
        <p className="text-2xl font-semibold tabular-nums mt-1 text-gray-900 dark:text-gray-100">
          {formatAmount(outlook.walletNetCumulative)}
        </p>
        <div className="mt-3 space-y-1">
          <p className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              {SETTLEMENT_UI_LABELS.walletExpensesInPeriod}:{' '}
            </span>
            {formatAmount(walletGroup.expenses.total)}
          </p>
          <p className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              {SETTLEMENT_UI_LABELS.walletIncomesInPeriod}:{' '}
            </span>
            {formatAmount(walletGroup.incomes.total)}
          </p>
        </div>
      </div>

      <PersonWalletTable
        person={person}
        rows={rows}
        breakdown={outlook.walletBreakdown}
        walletNames={walletNames}
        embedded
      />
    </div>
  )
}

export default function SettlementSummary() {
  const {
    data,
    refreshing,
    handleRefresh,
    walletNames,
    isPeriodClosed,
    filteredStandardDeposits,
    filteredSourceExpenseDeposits,
    filteredWalletGroups,
  } = useSettlementReport()

  if (!data || !filteredStandardDeposits || !filteredSourceExpenseDeposits || !filteredWalletGroups) {
    return null
  }

  const { rotation, personOutlook } = data
  const needsRefresh = !isPeriodClosed && (data.indexState?.needsRefresh ?? false)

  const maciekWallets = aggregateItemsByWallet(
    filteredWalletGroups.maciek.expenses.items,
    filteredWalletGroups.maciek.incomes.items,
  )
  const basiaWallets = aggregateItemsByWallet(
    filteredWalletGroups.basia.expenses.items,
    filteredWalletGroups.basia.incomes.items,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-4 justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="text-gray-500 dark:text-gray-500">
            {SETTLEMENT_UI_LABELS.lastRefreshedAt}:{' '}
          </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {formatDateTime(data.indexState?.lastRefreshedAt)}
          </span>
        </p>
        {!isPeriodClosed && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {SETTLEMENT_UI_LABELS.refreshSettlements}
          </button>
        )}
      </div>

      {needsRefresh && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {SETTLEMENT_UI_LABELS.needsRefreshBanner}
        </div>
      )}

      {data.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
            {data.excludedItemsCount > 0 && (
              <li>Pominięto {data.excludedItemsCount} pozycji z niekompletną klasyfikacją.</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RotationSummaryCard
          person="maciek"
          outlook={personOutlook.maciek}
          bankDepositsTotal={filteredStandardDeposits.maciek.total}
          ownContributionsTotal={filteredSourceExpenseDeposits.maciek.total}
        />
        <RotationSummaryCard
          person="basia"
          outlook={personOutlook.basia}
          bankDepositsTotal={filteredStandardDeposits.basia.total}
          ownContributionsTotal={filteredSourceExpenseDeposits.basia.total}
        />
      </div>

      <RotationFormulaBreakdown rotation={rotation} personOutlook={personOutlook} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {SETTLEMENT_UI_LABELS.ownContributionsSummaryTitle}
        </h3>
        <p className="text-sm text-gray-500">{SETTLEMENT_UI_LABELS.ownContributionsSummaryHint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['maciek', 'basia'] as const).map((person) => (
              <div
                key={person}
                className={['rounded-lg border p-4', personSectionClasses(person, { variant: 'section' })].join(' ')}
              >
                <p className={['text-xs font-medium', PERSON_THEMES[person].label].join(' ')}>
                  {PERSON_LABELS[person]}
                </p>
                <p className="text-lg font-semibold tabular-nums mt-1 text-gray-900 dark:text-gray-100">
                  {formatAmount(filteredSourceExpenseDeposits[person].total)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {filteredSourceExpenseDeposits[person].items.length} pozycji w okresie
                </p>
              </div>
          ))}
        </div>
        <Link
          to="wklady-wlasne"
          className="inline-block text-sm font-medium text-[#c9a96e] hover:underline"
        >
          {SETTLEMENT_UI_LABELS.ownContributionsDetailsLink} →
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {SETTLEMENT_UI_LABELS.personalWalletsTitle}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <PersonWalletColumn
            person="maciek"
            outlook={personOutlook.maciek}
            walletGroup={filteredWalletGroups.maciek}
            rows={maciekWallets}
            walletNames={walletNames}
          />
          <PersonWalletColumn
            person="basia"
            outlook={personOutlook.basia}
            walletGroup={filteredWalletGroups.basia}
            rows={basiaWallets}
            walletNames={walletNames}
          />
        </div>

        <p className="text-sm text-gray-500">
          {WALLET_GROUP_LABELS.other}: netto {formatAmount(filteredWalletGroups.other.net)} — szczegóły
          w zakładce Pozostałe.
        </p>
      </div>
    </div>
  )
}

function PersonWalletTable({
  person,
  rows,
  breakdown,
  walletNames,
  embedded,
}: {
  person: PersonKey
  rows: ReturnType<typeof aggregateItemsByWallet>
  breakdown: SettlementPersonOutlook['walletBreakdown']
  walletNames: Map<number, string>
  embedded?: boolean
}) {
  const theme = PERSON_THEMES[person]
  const balanceByWalletId = new Map(breakdown.map((b) => [b.walletId, b.balance]))
  const cumulativeByName = new Map<string, number>()
  for (const [id, balance] of balanceByWalletId) {
    const name = walletNames.get(id) ?? `Portfel #${id}`
    cumulativeByName.set(name, balance)
  }

  if (rows.length === 0 && breakdown.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Brak ruchów na portfelach w wybranym okresie.
      </p>
    )
  }

  const allWallets = new Set([...rows.map((r) => r.wallet), ...cumulativeByName.keys()])

  return (
    <div
      className={[
        'overflow-x-auto rounded-lg border',
        embedded ? 'border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-900/40' : theme.section,
      ].join(' ')}
    >
      <table className="w-full text-sm">
        {!embedded && (
          <caption className={['text-left px-4 py-2 font-medium', theme.label].join(' ')}>
            Portfele — {PERSON_LABELS[person]}
          </caption>
        )}
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <th className="px-3 py-2 font-medium text-xs">Portfel</th>
            <th className="px-3 py-2 font-medium text-right text-xs">Saldo skum.</th>
            <th className="px-3 py-2 font-medium text-right text-xs">Wydatki</th>
            <th className="px-3 py-2 font-medium text-right text-xs">Wpływy</th>
            <th className="px-3 py-2 font-medium text-right text-xs">Netto</th>
          </tr>
        </thead>
        <tbody>
          {[...allWallets].sort((a, b) => a.localeCompare(b, 'pl')).map((wallet) => {
            const row = rows.find((r) => r.wallet === wallet)
            const cumulative = cumulativeByName.get(wallet)
            return (
              <tr key={wallet} className="border-b border-gray-50 dark:border-gray-800/50">
                <td className="px-3 py-1.5">{wallet}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {cumulative !== undefined ? formatAmount(cumulative) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {row ? formatAmount(row.expenses) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {row ? formatAmount(row.incomes) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {row ? formatAmount(row.net) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
