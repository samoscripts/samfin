import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRightToLine, Loader2, Wallet, RefreshCw } from 'lucide-react'
import {
  fetchSettlementReport,
  refreshSettlementIndex,
  type SettlementReportResponse,
  type SettlementItemRef,
  type SettlementPersonOutlook,
  type PersonKey,
  type WalletGroupKey,
  type WalletSettlementGroup,
} from '@/shared/api/settlements'
import { useReportPeriodPanel } from '@/domains/home/reports/hooks/useReportPeriodPanel'
import PeriodNavigator from '@/shared/components/PeriodNavigator'
import PeriodSidebar from '@/shared/components/PeriodSidebar'
import { formatAmount } from '@/shared/utils/format'
import {
  currentYearMonth,
  parseReportPeriod,
  paramToYearMonth,
  serializeReportMonthPeriod,
  serializeReportRangePeriod,
  todayIsoDate,
  withReportPeriodPanel,
} from '@/shared/utils/periodUrl'

const PERSON_LABELS: Record<string, string> = {
  maciek: 'Maciek',
  basia: 'Basia',
}

const WALLET_GROUP_LABELS: Record<WalletGroupKey, string> = {
  maciek: 'Portfele Maćka',
  basia: 'Portfele Basi',
  other: 'Inne',
}

type PersonTheme = {
  card: string
  cardQueue: string
  icon: string
  label: string
  badge: string
  badgeDot: string
  section: string
}

const PERSON_THEMES: Record<PersonKey, PersonTheme> = {
  maciek: {
    card: 'bg-[#163526]/5 dark:bg-[#163526]/15 border-[#163526]/20 dark:border-[#163526]/35',
    cardQueue: 'ring-1 ring-[#163526]/30 dark:ring-emerald-500/40',
    icon: 'text-[#1a472a] dark:text-emerald-400',
    label: 'text-[#163526] dark:text-emerald-300/90',
    badge: 'bg-[#1a472a] text-white dark:bg-[#163526]',
    badgeDot: 'bg-emerald-500',
    section: 'bg-[#163526]/[0.03] dark:bg-[#163526]/10 border-[#163526]/15 dark:border-[#163526]/30',
  },
  basia: {
    card: 'bg-[#c9a96e]/8 dark:bg-[#c9a96e]/10 border-[#c9a96e]/35 dark:border-[#c9a96e]/30',
    cardQueue: 'ring-1 ring-[#c9a96e]/45 dark:ring-[#c9a96e]/50',
    icon: 'text-[#8a7340] dark:text-[#c9a96e]',
    label: 'text-[#7a6340] dark:text-[#c9a96e]',
    badge: 'bg-[#c9a96e] text-white',
    badgeDot: 'bg-[#c9a96e]',
    section: 'bg-[#c9a96e]/5 dark:bg-[#c9a96e]/8 border-[#c9a96e]/25 dark:border-[#c9a96e]/22',
  },
}

const OTHER_SECTION_THEME = 'bg-gray-50/50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700'


export default function SettlementReport() {
  const periodTriggerRef = useRef<HTMLButtonElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: periodPanelOpen, openPanel, closePanel, portalRoot } = useReportPeriodPanel()
  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(() => parseReportPeriod(searchParams, defaults), [searchParams, defaults])

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

  const handleMonthChange = useCallback(
    (monthParam: string) => {
      const ym = paramToYearMonth(monthParam)
      if (!ym) return
      setSearchParams(
        serializeReportMonthPeriod(ym.year, ym.month, defaults),
        { replace: true },
      )
    },
    [defaults, setSearchParams],
  )

  const handleApplyMonthPick = useCallback(
    (year: number, month: number) => {
      const params = withReportPeriodPanel(
        serializeReportMonthPeriod(year, month, defaults),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [defaults, setSearchParams, periodPanelOpen],
  )

  const handleRangeChange = useCallback(
    (dateFrom: string, dateTo: string) => {
      const params = withReportPeriodPanel(
        serializeReportRangePeriod(dateFrom, dateTo),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [setSearchParams, periodPanelOpen],
  )

  const rangePresets = useMemo(() => {
    const reindexFrom = data?.config.reindexFromDate
    if (!reindexFrom) return []
    return [{
      label: 'Od początku indeksu',
      dateFrom: reindexFrom,
      dateTo: todayIsoDate(),
      hint: `Od ${reindexFrom} do dziś`,
    }]
  }, [data?.config.reindexFromDate])

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
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 justify-between">
          <PeriodNavigator
            monthParam={period.monthParam}
            isCustomRange={period.isCustomRange}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            showAdvanced
            advancedOpen={periodPanelOpen}
            onOpenAdvanced={openPanel}
            advancedButtonRef={periodTriggerRef}
            onMonthChange={handleMonthChange}
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 shrink-0"
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

      {portalRoot &&
        createPortal(
          <PeriodSidebar
            open={periodPanelOpen}
            onClose={closePanel}
            year={period.year}
            month={period.month}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            isCustomRange={period.isCustomRange}
            rangePresets={rangePresets}
            onApplyMonth={handleApplyMonthPick}
            onApplyRange={handleRangeChange}
            returnFocusRef={periodTriggerRef}
          />,
          portalRoot,
        )}
    </>
  )
}

function SettlementContent({ data }: { data: SettlementReportResponse }) {
  const { rotation, personOutlook } = data
  const needsRefresh = data.indexState?.needsRefresh ?? false

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Okres raportu: {data.dateFrom} — {data.dateTo}
      </p>

      {needsRefresh && (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <PersonOutlookColumn
          person="maciek"
          outlook={personOutlook.maciek}
          rotation={rotation}
          needsRefresh={needsRefresh}
        />
        <PersonOutlookColumn
          person="basia"
          outlook={personOutlook.basia}
          rotation={rotation}
          needsRefresh={needsRefresh}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <StandardDepositsSection
          person="maciek"
          title="Wpłaty rotacyjne — Maciek"
          total={data.standardDeposits.maciek.total}
          items={data.standardDeposits.maciek.items}
          isAnchor={personOutlook.maciek.isAnchor}
          className="h-full"
        />
        <StandardDepositsSection
          person="basia"
          title="Wpłaty rotacyjne — Basia"
          total={data.standardDeposits.basia.total}
          items={data.standardDeposits.basia.items}
          isAnchor={personOutlook.basia.isAnchor}
          className="h-full"
        />
      </div>

      <PairedWalletGroups
        maciek={data.walletGroups.maciek}
        basia={data.walletGroups.basia}
      />

      <WalletGroupSection
        personKey="other"
        title={WALLET_GROUP_LABELS.other}
        group={data.walletGroups.other}
        informational
      />
    </>
  )
}

function PersonOutlookColumn({
  person,
  outlook,
  rotation,
  needsRefresh,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
  rotation: SettlementReportResponse['rotation']
  needsRefresh: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full auto-rows-fr">
      <DepositOutlookCard
        person={person}
        outlook={outlook}
      />
      <WalletOutlookCard
        person={person}
        outlook={outlook}
        asOfDate={rotation.asOfDate}
        needsRefresh={needsRefresh}
      />
    </div>
  )
}

function DepositOutlookCard({
  person,
  outlook,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
}) {
  const label = outlook.isAnchor
    ? `Wpłata rotacyjna — ${PERSON_LABELS[person]}`
    : `Podgląd — ${PERSON_LABELS[person]}`

  return (
    <StatCard
      person={person}
      label={label}
      value={formatAmount(outlook.suggestedAmount)}
      sub={outlook.formulaSummary}
      icon={<Wallet size={18} />}
      queueActive={outlook.isAnchor}
    />
  )
}

function WalletOutlookCard({
  person,
  outlook,
  asOfDate,
  needsRefresh,
}: {
  person: PersonKey
  outlook: SettlementPersonOutlook
  asOfDate?: string
  needsRefresh: boolean
}) {
  const periodLabel = outlook.walletNetInPeriod >= 0
    ? `+${formatAmount(outlook.walletNetInPeriod)}`
    : formatAmount(outlook.walletNetInPeriod)

  const subParts = [
    `W okresie: ${periodLabel}`,
    asOfDate ? `Skumulowane w indeksie (stan na ${asOfDate})` : 'Skumulowane w indeksie',
    needsRefresh ? 'Odśwież indeks, aby zobaczyć saldo skumulowane' : null,
  ].filter(Boolean)

  return (
    <StatCard
      person={person}
      label={`Portfele osobiste — ${PERSON_LABELS[person]}`}
      value={formatAmount(outlook.walletNetCumulative)}
      sub={subParts.join(' · ')}
    />
  )
}

function StatCard({
  person,
  label,
  value,
  sub,
  icon,
  queueActive,
}: {
  person: PersonKey
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  queueActive?: boolean
}) {
  const theme = PERSON_THEMES[person]

  return (
    <div className={[
      'relative border rounded-xl p-5 transition-shadow h-full',
      theme.card,
      queueActive ? theme.cardQueue : '',
    ].join(' ')}>
      {queueActive && (
        <div
          className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-md ring-1 ring-black/5 dark:ring-white/10"
          title="Ta osoba wpisuje w tej rotacji"
        >
          <ArrowRightToLine size={14} className={theme.icon} aria-hidden />
        </div>
      )}
      <div className="flex h-full items-start gap-3">
        {icon && (
          <div className={['shrink-0 mt-0.5', theme.icon].join(' ')}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={['text-sm font-medium', theme.label].join(' ')}>{label}</p>
            {queueActive && (
              <span className={[
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                theme.badge,
              ].join(' ')}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={['absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', theme.badgeDot].join(' ')} />
                  <span className={['relative inline-flex h-1.5 w-1.5 rounded-full', theme.badgeDot].join(' ')} />
                </span>
                Wpisuje teraz
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function StandardDepositsSection({
  person,
  title,
  total,
  items,
  isAnchor,
  className,
}: {
  person: PersonKey
  title: string
  total: number
  items: SettlementItemRef[]
  isAnchor: boolean
  className?: string
}) {
  const theme = PERSON_THEMES[person]

  return (
    <div className={[
      'border rounded-xl p-5 flex flex-col',
      theme.section,
      isAnchor ? theme.cardQueue : '',
      className,
    ].join(' ')}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className={['text-sm font-semibold', theme.label].join(' ')}>{title}</h3>
          {isAnchor && (
            <span className={['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', theme.badge].join(' ')}>
              <ArrowRightToLine size={12} aria-hidden />
              Wpisuje teraz
            </span>
          )}
        </div>
        <span className="text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300 shrink-0">
          {formatAmount(total)}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 flex-1">Brak wpłat w okresie.</p>
      ) : (
        <div className="flex-1 min-h-0">
          <ItemsTable items={items} />
        </div>
      )}
    </div>
  )
}

function PairedWalletGroups({
  maciek,
  basia,
}: {
  maciek: WalletSettlementGroup
  basia: WalletSettlementGroup
}) {
  return (
    <>
      <div className="space-y-4 lg:hidden">
        <WalletGroupSection
          personKey="maciek"
          title={WALLET_GROUP_LABELS.maciek}
          group={maciek}
        />
        <WalletGroupSection
          personKey="basia"
          title={WALLET_GROUP_LABELS.basia}
          group={basia}
        />
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 gap-4 items-stretch">
        <WalletGroupHeader
          personKey="maciek"
          title={WALLET_GROUP_LABELS.maciek}
          group={maciek}
          className="h-full"
        />
        <WalletGroupHeader
          personKey="basia"
          title={WALLET_GROUP_LABELS.basia}
          group={basia}
          className="h-full"
        />
        <BucketSection
          personKey="maciek"
          title="Wydatki"
          total={maciek.expenses.total}
          items={maciek.expenses.items}
          className="h-full"
        />
        <BucketSection
          personKey="basia"
          title="Wydatki"
          total={basia.expenses.total}
          items={basia.expenses.items}
          className="h-full"
        />
        <BucketSection
          personKey="maciek"
          title="Wpływy"
          total={maciek.incomes.total}
          items={maciek.incomes.items}
          className="h-full"
        />
        <BucketSection
          personKey="basia"
          title="Wpływy"
          total={basia.incomes.total}
          items={basia.incomes.items}
          className="h-full"
        />
      </div>
    </>
  )
}

function WalletGroupHeader({
  personKey,
  title,
  group,
  className,
}: {
  personKey: PersonKey
  title: string
  group: WalletSettlementGroup
  className?: string
}) {
  const theme = PERSON_THEMES[personKey]

  return (
    <div className={[
      'rounded-xl p-5 border',
      theme.section,
      className,
    ].join(' ')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 h-full">
        <h3 className={['text-sm font-semibold', theme.label].join(' ')}>{title}</h3>
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
    </div>
  )
}

function WalletGroupSection({
  personKey,
  title,
  group,
  informational,
  className,
}: {
  personKey: WalletGroupKey
  title: string
  group: WalletSettlementGroup
  informational?: boolean
  className?: string
}) {
  const hasItems = group.expenses.items.length > 0 || group.incomes.items.length > 0
  const isPerson = personKey === 'maciek' || personKey === 'basia'
  const theme = isPerson ? PERSON_THEMES[personKey] : null

  return (
    <div className={[
      'rounded-xl p-5 space-y-4 border h-full',
      isPerson ? theme!.section : OTHER_SECTION_THEME,
      className,
    ].join(' ')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className={[
            'text-sm font-semibold',
            isPerson ? theme!.label : 'text-gray-700 dark:text-gray-300',
          ].join(' ')}>
            {title}
          </h3>
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
        <div className="flex flex-col gap-4">
          <BucketSection title="Wydatki" total={group.expenses.total} items={group.expenses.items} personKey={isPerson ? personKey : undefined} />
          <BucketSection title="Wpływy" total={group.incomes.total} items={group.incomes.items} personKey={isPerson ? personKey : undefined} />
        </div>
      )}
    </div>
  )
}

function BucketSection({
  title,
  total,
  items,
  personKey,
  className,
}: {
  title: string
  total: number
  items: SettlementItemRef[]
  personKey?: PersonKey
  className?: string
}) {
  const theme = personKey ? PERSON_THEMES[personKey] : null

  return (
    <div className={[
      'border rounded-lg p-4 flex flex-col h-full',
      personKey ? theme!.section : 'border-gray-100 dark:border-gray-800',
      className,
    ].join(' ')}>
      <div className="flex items-baseline justify-between mb-3 shrink-0">
        <h4 className={[
          'text-sm font-medium',
          personKey ? theme!.label : 'text-gray-800 dark:text-gray-200',
        ].join(' ')}>
          {title}
        </h4>
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">{formatAmount(total)}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 flex-1">Brak pozycji.</p>
      ) : (
        <div className="flex-1 min-h-0">
          <ItemsTable items={items} compact />
        </div>
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
