import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransactionPanel, resolveRightPanelOwner } from '@/domains/home/transactions/panel'
import {
  fetchSettlementPeriods,
  fetchSettlementReport,
  refreshSettlementIndex,
  type SettlementPeriodsResponse,
  type SettlementReportResponse,
} from '@/shared/api/settlements'
import { fetchWallets } from '@/shared/api/wallets'
import { SETTLEMENT_UI_LABELS } from '@/domains/home/reports/settlements/constants'
import { currentMonthParam } from '@/shared/utils/monthQuery'
import type { SettlementPeriodFilter } from '@/domains/home/reports/settlements/utils/periodFilter'
import {
  filterWalletGroup,
  resolvePeriodBounds,
} from '@/domains/home/reports/settlements/utils/periodFilter'

interface SettlementReportContextValue {
  data: SettlementReportResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  configMissing: boolean
  walletNames: Map<number, string>
  settlementYear: number
  periodsMeta: SettlementPeriodsResponse | null
  isPeriodClosed: boolean
  effectiveFrom: string
  effectiveTo: string
  periodFilter: SettlementPeriodFilter
  setPeriodFilter: (filter: SettlementPeriodFilter) => void
  filteredStandardDeposits: SettlementReportResponse['standardDeposits'] | null
  filteredSourceExpenseDeposits: SettlementReportResponse['sourceExpenseDeposits'] | null
  filteredWalletGroups: SettlementReportResponse['walletGroups'] | null
  handleRefresh: () => Promise<void>
  handleYearChange: (year: number) => void
  openTx: (transactionId: number) => void
}

const SettlementReportContext = createContext<SettlementReportContextValue | null>(null)

const DEFAULT_PERIOD_FILTER: SettlementPeriodFilter = {
  mode: 'full',
  monthParam: currentMonthParam(),
  dateFrom: '',
  dateTo: '',
}

function parseSettlementYear(searchParams: URLSearchParams): number {
  const raw = searchParams.get('settlementYear')
  if (!raw) return new Date().getFullYear()
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : new Date().getFullYear()
}

export function SettlementReportProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const settlementYear = useMemo(() => parseSettlementYear(searchParams), [searchParams])

  const [periodsMeta, setPeriodsMeta] = useState<SettlementPeriodsResponse | null>(null)
  const [data, setData] = useState<SettlementReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configMissing, setConfigMissing] = useState(false)
  const [walletNames, setWalletNames] = useState<Map<number, string>>(new Map())
  const [periodFilter, setPeriodFilter] = useState<SettlementPeriodFilter>(DEFAULT_PERIOD_FILTER)

  const effectiveFrom = data?.settlementPeriod?.effectiveFrom ?? data?.dateFrom ?? ''
  const effectiveTo = data?.settlementPeriod?.effectiveTo ?? data?.dateTo ?? ''
  const isPeriodClosed = data?.settlementPeriod?.status === 'closed'

  const loadReport = useCallback(() => {
    return fetchSettlementReport({ settlementYear })
  }, [settlementYear])

  const handleYearChange = useCallback(
    (year: number) => {
      const params = new URLSearchParams(searchParams)
      params.set('settlementYear', String(year))
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleReportMutated = useCallback(() => {
    void loadReport().then(setData).catch(() => {})
  }, [loadReport])

  const { openTx, transactionPanelPortal, confirmDialogs } = useTransactionPanel({
    onMutated: handleReportMutated,
  })
  const panelOwner = resolveRightPanelOwner(searchParams)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setConfigMissing(false)

    Promise.all([fetchSettlementPeriods().catch(() => null), loadReport()])
      .then(([periods, resp]) => {
        if (cancelled) return
        if (periods) setPeriodsMeta(periods)
        setData(resp)
        setPeriodFilter((prev) => ({
          ...prev,
          dateFrom: resp.settlementPeriod?.effectiveFrom ?? resp.dateFrom,
          dateTo: resp.settlementPeriod?.effectiveTo ?? resp.dateTo,
        }))
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

    return () => {
      cancelled = true
    }
  }, [loadReport])

  useEffect(() => {
    let cancelled = false
    void fetchWallets()
      .then((wallets) => {
        if (cancelled) return
        setWalletNames(new Map(wallets.map((w) => [w.id, w.name])))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    if (isPeriodClosed) return
    setRefreshing(true)
    setError(null)
    try {
      await refreshSettlementIndex()
      const resp = await loadReport()
      setData(resp)
    } catch {
      setError(SETTLEMENT_UI_LABELS.refreshSettlementsError)
    } finally {
      setRefreshing(false)
    }
  }, [isPeriodClosed, loadReport])

  const filteredStandardDeposits = useMemo(() => {
    if (!data || !effectiveFrom || !effectiveTo) return null
    const { dateFrom, dateTo } = resolvePeriodBounds(periodFilter, effectiveFrom, effectiveTo)
    const filterBucket = (bucket: (typeof data.standardDeposits)['maciek']) => {
      const items = bucket.items.filter((i) => i.date >= dateFrom && i.date <= dateTo)
      const total = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100
      return { items, total }
    }
    return {
      maciek: filterBucket(data.standardDeposits.maciek),
      basia: filterBucket(data.standardDeposits.basia),
    }
  }, [data, periodFilter, effectiveFrom, effectiveTo])

  const filteredSourceExpenseDeposits = useMemo(() => {
    if (!data || !effectiveFrom || !effectiveTo) return null
    const { dateFrom, dateTo } = resolvePeriodBounds(periodFilter, effectiveFrom, effectiveTo)
    const filterBucket = (bucket: (typeof data.sourceExpenseDeposits)['maciek']) => {
      const items = bucket.items.filter((i) => i.date >= dateFrom && i.date <= dateTo)
      const total = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100
      return { items, total }
    }
    return {
      maciek: filterBucket(data.sourceExpenseDeposits.maciek),
      basia: filterBucket(data.sourceExpenseDeposits.basia),
    }
  }, [data, periodFilter, effectiveFrom, effectiveTo])

  const filteredWalletGroups = useMemo(() => {
    if (!data || !effectiveFrom || !effectiveTo) return null
    const { dateFrom, dateTo } = resolvePeriodBounds(periodFilter, effectiveFrom, effectiveTo)
    return {
      maciek: filterWalletGroup(data.walletGroups.maciek, dateFrom, dateTo),
      basia: filterWalletGroup(data.walletGroups.basia, dateFrom, dateTo),
      other: filterWalletGroup(data.walletGroups.other, dateFrom, dateTo),
    }
  }, [data, periodFilter, effectiveFrom, effectiveTo])

  const value: SettlementReportContextValue = {
    data,
    loading,
    refreshing,
    error,
    configMissing,
    walletNames,
    settlementYear,
    periodsMeta,
    isPeriodClosed,
    effectiveFrom,
    effectiveTo,
    periodFilter,
    setPeriodFilter,
    filteredStandardDeposits,
    filteredSourceExpenseDeposits,
    filteredWalletGroups,
    handleRefresh,
    handleYearChange,
    openTx,
  }

  return (
    <SettlementReportContext.Provider value={value}>
      {children}
      {panelOwner === 'transaction' && transactionPanelPortal}
      {confirmDialogs}
    </SettlementReportContext.Provider>
  )
}

export function useSettlementReport(): SettlementReportContextValue {
  const ctx = useContext(SettlementReportContext)
  if (!ctx) {
    throw new Error('useSettlementReport must be used within SettlementReportProvider')
  }
  return ctx
}
