import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import {
  fetchCommonAccountSettlement,
  type CommonAccountSettlementResponse,
} from '@/shared/api/commonAccountSettlement'
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

function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function CommonAccountSettlementReport() {
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

  const [data, setData] = useState<CommonAccountSettlementResponse | null>(null)
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

    fetchCommonAccountSettlement({ year, month })
      .then((resp) => {
        if (!cancelled) setData(resp)
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (cancelled) return
        setData(null)
        if (err.response?.status === 422) {
          setConfigMissing(true)
          setError(err.response.data?.message ?? 'Skonfiguruj raport w zakładce Konfiguracja.')
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

function SettlementContent({ data }: { data: CommonAccountSettlementResponse }) {
  const nd = data.nextDeposit

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
          sub={`bazowo ${formatAmount(nd.baseAmount)} + korekty ${formatAmount(nd.corrections)} + saldo ${formatAmount(nd.carryOver)}`}
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
          label="Korekty (łącznie)"
          value={formatAmount(data.corrections.total)}
          sub={`nieprzypisane: ${formatAmount(data.unassignedCorrections)}`}
          icon={<ArrowUpRight size={18} className="text-orange-600" />}
        />
        <StatCard
          label="Saldo do przeniesienia"
          value={formatAmount(nd.carryForward)}
          sub="niedopłata na kolejny okres"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Wpłaty Maciek" total={data.deposits.maciek.total} items={data.deposits.maciek.items} />
        <Section title="Wpłaty Basia" total={data.deposits.basia.total} items={data.deposits.basia.items} />
      </div>

      <Section
        title="Korekty — wydatki ze wspólnego na inne portfele"
        total={data.corrections.total}
        items={data.corrections.items}
      />

      {data.deposits.other.items.length > 0 && (
        <Section
          title="Inne wpływy na konto wspólne"
          total={data.deposits.other.total}
          items={data.deposits.other.items}
        />
      )}

      {Object.keys(data.expensesFromCommon).length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Wydatki ze wspólnego wg portfela
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 font-medium">Portfel</th>
                <th className="pb-2 font-medium text-right">Liczba</th>
                <th className="pb-2 font-medium text-right">Suma</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.expensesFromCommon).map(([name, row]) => (
                <tr key={name} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="py-2">{name}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 text-right tabular-nums">{formatAmount(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function Section({
  title,
  total,
  items,
}: {
  title: string
  total: number
  items: CommonAccountSettlementResponse['corrections']['items']
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-400 mt-2">Brak pozycji.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <span className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
          {formatAmount(total)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th className="pb-2 pr-3 font-medium">Data</th>
              <th className="pb-2 pr-3 font-medium">Opis</th>
              <th className="pb-2 pr-3 font-medium">Portfel</th>
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
                <td className="py-2 pr-3">{item.wallet ?? '—'}</td>
                <td className="py-2 text-right tabular-nums">{formatAmount(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
