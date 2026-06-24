import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import {
  fetchSettlementReport,
  type SettlementReportResponse,
  type SettlementItemRef,
  type WalletGroupKey,
  type WalletSettlementGroup,
} from '@/shared/api/settlements'
import { buildSearchParams, parsePositiveInt } from '@/shared/utils/urlQuery'
import { formatAmount } from '@/shared/utils/format'

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

const PERSON_LABELS: Record<string, string> = {
  maciek: 'Maciek',
  basia: 'Basia',
}

const WALLET_GROUP_LABELS: Record<WalletGroupKey, string> = {
  maciek: 'Portfele Maćka',
  basia: 'Portfele Basi',
  other: 'Inne',
}

function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function SettlementReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaults = currentYearMonth()

  const year = useMemo(
    () => parsePositiveInt(searchParams.get('year')) ?? defaults.year,
    [searchParams, defaults.year],
  )
  const month = useMemo(() => {
    const m = parsePositiveInt(searchParams.get('month')) ?? defaults.month
    return m >= 1 && m <= 12 ? m : defaults.month
  }, [searchParams, defaults.month])

  const [data, setData] = useState<SettlementReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configMissing, setConfigMissing] = useState(false)

  const updateParams = useCallback(
    (patch: { year?: number; month?: number }) => {
      const nextYear = patch.year ?? year
      const nextMonth = patch.month ?? month
      const params = buildSearchParams({
        year: nextYear !== defaults.year ? nextYear : undefined,
        month: nextMonth !== defaults.month ? nextMonth : undefined,
      })
      setSearchParams(params, { replace: true })
    },
    [year, month, defaults.year, defaults.month, setSearchParams],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setConfigMissing(false)

    fetchSettlementReport({ year, month })
      .then((resp) => {
        if (!cancelled) setData(resp)
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (cancelled) return
        setData(null)
        if (err.response?.status === 422) {
          setConfigMissing(true)
          setError(err.response.data?.message ?? 'Skonfiguruj rozliczenie w zakładce Konfiguracja.')
        } else {
          setError('Nie udało się załadować raportu.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [year, month])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => y - i)
  }, [])

  if (configMissing) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        <Link
          to="settings"
          className="inline-block mt-3 text-sm font-medium text-[#c9a96e] hover:underline"
        >
          Przejdź do konfiguracji →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Rok
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => updateParams({ year: Number(e.target.value) })}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Miesiąc
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={month}
            onChange={(e) => updateParams({ month: Number(e.target.value) })}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : data ? (
        <SettlementContent data={data} />
      ) : null}
    </div>
  )
}

function SettlementContent({ data }: { data: SettlementReportResponse }) {
  const nd = data.nextDeposit
  const personNet = data.walletGroups[nd.person].net

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Okres: {data.dateFrom} — {data.dateTo}
      </p>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={`Następna wpłata: ${PERSON_LABELS[nd.person]}`}
          value={formatAmount(nd.dueAmount)}
          sub={`bazowo ${formatAmount(nd.baseAmount)} + saldo portfeli ${formatAmount(nd.walletNet)} + przeniesienie ${formatAmount(nd.carryOver)}`}
          icon={<Wallet size={18} className="text-[#c9a96e]" />}
          highlight
        />
        <StatCard
          label="Wpłacono w okresie"
          value={formatAmount(nd.paidInPeriod)}
          sub={nd.underpayment > 0 ? `Niedopłata: ${formatAmount(nd.underpayment)}` : nd.overpayment > 0 ? `Nadpłata: ${formatAmount(nd.overpayment)}` : 'Rozliczone'}
          icon={<ArrowDownLeft size={18} className="text-emerald-600" />}
        />
        <StatCard
          label={`Saldo portfeli (${PERSON_LABELS[nd.person]})`}
          value={formatAmount(personNet)}
          sub={personNet !== 0 ? `Wpływ na wpłatę: ${formatAmount(nd.walletNet)}` : 'Bez wpływu na wpłatę'}
          icon={<ArrowUpRight size={18} className="text-orange-600" />}
        />
        <StatCard
          label="Saldo do przeniesienia"
          value={formatAmount(nd.carryForward)}
          sub="niedopłata na kolejny okres"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StandardDepositsSection
          title="Wpłaty rotacyjne — Maciek"
          total={data.standardDeposits.maciek.total}
          items={data.standardDeposits.maciek.items}
        />
        <StandardDepositsSection
          title="Wpłaty rotacyjne — Basia"
          total={data.standardDeposits.basia.total}
          items={data.standardDeposits.basia.items}
        />
      </div>

      <div className="space-y-6">
        {(['maciek', 'basia', 'other'] as const).map((key) => (
          <WalletGroupSection
            key={key}
            title={WALLET_GROUP_LABELS[key]}
            group={data.walletGroups[key]}
            informational={key === 'other'}
          />
        ))}
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className={[
      'border rounded-xl p-5',
      highlight
        ? 'bg-[#c9a96e]/5 border-[#c9a96e]/30 dark:bg-[#c9a96e]/10'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function StandardDepositsSection({
  title,
  total,
  items,
}: {
  title: string
  total: number
  items: SettlementItemRef[]
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <span className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
          {formatAmount(total)}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Brak wpłat w okresie.</p>
      ) : (
        <ItemsTable items={items} />
      )}
    </div>
  )
}

function WalletGroupSection({
  title,
  group,
  informational,
}: {
  title: string
  group: WalletSettlementGroup
  informational?: boolean
}) {
  const hasItems = group.expenses.items.length > 0 || group.incomes.items.length > 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {informational && (
            <p className="text-xs text-gray-400 mt-0.5">Tylko informacyjnie — nie wpływa na następną wpłatę.</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Saldo netto</p>
          <p className={[
            'text-lg font-semibold tabular-nums',
            group.net > 0 ? 'text-orange-600' : group.net < 0 ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300',
          ].join(' ')}>
            {formatAmount(group.net)}
          </p>
          <p className="text-xs text-gray-400">
            wydatki {formatAmount(group.expenses.total)} − wpływy {formatAmount(group.incomes.total)}
          </p>
        </div>
      </div>

      {!hasItems ? (
        <p className="text-sm text-gray-400">Brak pozycji w tej grupie.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <BucketSection title="Wydatki" total={group.expenses.total} items={group.expenses.items} />
          <BucketSection title="Wpływy" total={group.incomes.total} items={group.incomes.items} />
        </div>
      )}
    </div>
  )
}

function BucketSection({
  title,
  total,
  items,
}: {
  title: string
  total: number
  items: SettlementItemRef[]
}) {
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">{formatAmount(total)}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Brak pozycji.</p>
      ) : (
        <ItemsTable items={items} compact />
      )}
    </div>
  )
}

function ItemsTable({ items, compact }: { items: SettlementItemRef[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <th className="pb-2 pr-3 font-medium">Data</th>
            <th className="pb-2 pr-3 font-medium">Opis</th>
            {!compact && <th className="pb-2 pr-3 font-medium">Portfel</th>}
            <th className="pb-2 font-medium text-right">Kwota</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.transactionId}-${item.itemId}`} className="border-b border-gray-50 dark:border-gray-800/50">
              <td className="py-2 pr-3 whitespace-nowrap">{item.date}</td>
              <td className="py-2 pr-3 max-w-[200px] truncate">
                <Link
                  to={`/transactions/${item.transactionId}/edit`}
                  className="text-[#c9a96e] hover:underline"
                  title={item.description ?? undefined}
                >
                  {item.description || `#${item.transactionId}`}
                </Link>
              </td>
              {!compact && <td className="py-2 pr-3">{item.wallet ?? '—'}</td>}
              <td className="py-2 text-right tabular-nums">{formatAmount(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
