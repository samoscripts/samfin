import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2, Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react'
import {
  fetchSettlementReport,
  refreshSettlementIndex,
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

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
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

  const dateFromParam = searchParams.get('dateFrom')
  const dateToParam = searchParams.get('dateTo')
  const isCustomRange = Boolean(dateFromParam && dateToParam)
  const period = useMemo(() => {
    if (isCustomRange) {
      return { dateFrom: dateFromParam!, dateTo: dateToParam! }
    }
    return monthRange(year, month)
  }, [isCustomRange, dateFromParam, dateToParam, year, month])

  const [data, setData] = useState<SettlementReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configMissing, setConfigMissing] = useState(false)

  const loadReport = useCallback(() => {
    return fetchSettlementReport({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    })
  }, [period.dateFrom, period.dateTo])

  const updateMonthParams = useCallback(
    (patch: { year?: number; month?: number }) => {
      const nextYear = patch.year ?? year
      const nextMonth = patch.month ?? month
      const params = buildSearchParams({
        year: nextYear !== defaults.year ? nextYear : undefined,
        month: nextMonth !== defaults.month ? nextMonth : undefined,
      })
      // Miesiąc/rok nadpisują jawny zakres dat w URL.
      params.delete('dateFrom')
      params.delete('dateTo')
      setSearchParams(params, { replace: true })
    },
    [year, month, defaults.year, defaults.month, setSearchParams],
  )

  const updateDateRange = useCallback(
    (patch: { dateFrom?: string; dateTo?: string }) => {
      const nextFrom = patch.dateFrom ?? period.dateFrom
      const nextTo = patch.dateTo ?? period.dateTo
      if (nextFrom > nextTo) {
        return
      }
      const params = buildSearchParams({
        dateFrom: nextFrom,
        dateTo: nextTo,
      })
      setSearchParams(params, { replace: true })
    },
    [period.dateFrom, period.dateTo, setSearchParams],
  )

  const resetToMonthRange = useCallback(() => {
    setSearchParams(buildSearchParams({
      year: year !== defaults.year ? year : undefined,
      month: month !== defaults.month ? month : undefined,
    }), { replace: true })
  }, [year, month, defaults.year, defaults.month, setSearchParams])

  const applyFullIndexRange = useCallback((reindexFrom: string | null) => {
    const today = new Date()
    const dateTo = today.toISOString().slice(0, 10)
    const dateFrom = reindexFrom ?? dateTo
    setSearchParams(buildSearchParams({ dateFrom, dateTo }), { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setConfigMissing(false)

    loadReport()
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
  }, [loadReport])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await refreshSettlementIndex()
      const resp = await loadReport()
      setData(resp)
    } catch {
      setError('Nie udało się odświeżyć indeksu rozliczeń.')
    } finally {
      setRefreshing(false)
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Rok
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-50"
            value={year}
            disabled={isCustomRange}
            title={isCustomRange ? 'Wyłącz zakres niestandardowy, aby wybrać miesiąc' : undefined}
            onChange={(e) => updateMonthParams({ year: Number(e.target.value) })}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Miesiąc
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-50"
            value={month}
            disabled={isCustomRange}
            title={isCustomRange ? 'Wyłącz zakres niestandardowy, aby wybrać miesiąc' : undefined}
            onChange={(e) => updateMonthParams({ month: Number(e.target.value) })}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Od
          <input
            type="date"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={period.dateFrom}
            onChange={(e) => updateDateRange({ dateFrom: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Do
          <input
            type="date"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={period.dateTo}
            onChange={(e) => updateDateRange({ dateTo: e.target.value })}
          />
        </label>
        {isCustomRange && (
          <button
            type="button"
            onClick={resetToMonthRange}
            className="text-sm text-gray-600 dark:text-gray-400 underline-offset-2 hover:underline"
          >
            Miesiąc zamiast zakresu
          </button>
        )}
        {data?.config.reindexFromDate && (
          <button
            type="button"
            onClick={() => applyFullIndexRange(data.config.reindexFromDate)}
            className="text-sm text-[#c9a96e] underline-offset-2 hover:underline"
          >
            Cały indeks
          </button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Odśwież rozliczenia
        </button>
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

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Okres raportu: {data.dateFrom} — {data.dateTo}
      </p>

      {data.indexState?.needsRefresh && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Indeks rozliczeń wymaga odświeżenia — dane mogą być nieaktualne. Kliknij „Odśwież rozliczenia”.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={`Następna wpłata: ${PERSON_LABELS[nd.person]}`}
          value={formatAmount(nd.suggestedAmount ?? nd.dueAmount)}
          sub={[
            nd.asOfDate ? `Stan indeksu na ${nd.asOfDate}.` : null,
            `${formatAmount(nd.baseAmount)} − carry ${formatAmount(nd.rotationCarry ?? nd.carryOver)} + portfele ${formatAmount(nd.walletNet)}${(nd.rotationPrepaid ?? 0) > 0 ? ` − prepaid ${formatAmount(nd.rotationPrepaid)}` : ''}`,
          ].filter(Boolean).join(' ')}
          icon={<Wallet size={18} className="text-[#c9a96e]" />}
          highlight
        />
        <StatCard
          label="Wpłacono w okresie"
          value={formatAmount(nd.paidInPeriod)}
          sub={nd.underpayment > 0 ? `Niedopłata: ${formatAmount(nd.underpayment)}` : nd.overpayment > 0 ? `Nadpłata: ${formatAmount(nd.overpayment)}` : 'Rozliczone w wybranym okresie'}
          icon={<ArrowDownLeft size={18} className="text-emerald-600" />}
        />
        <StatCard
          label={`Saldo portfeli (${PERSON_LABELS[nd.person]})`}
          value={formatAmount(nd.walletNet)}
          sub="Skumulowane w indeksie (nie tylko w okresie)"
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
