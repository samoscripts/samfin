import { Link, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import SettlementDetailPeriodFilter from '@/domains/home/reports/settlements/components/SettlementDetailPeriodFilter'
import { SettlementReportProvider, useSettlementReport } from '@/domains/home/reports/settlements/context/SettlementReportContext'

function SettlementReportShell() {
  const {
    loading,
    error,
    configMissing,
    settlementYear,
    periodsMeta,
    isPeriodClosed,
    handleYearChange,
    periodFilter,
    setPeriodFilter,
    effectiveFrom,
    effectiveTo,
  } = useSettlementReport()

  const firstYear = periodsMeta?.firstYear ?? settlementYear
  const currentYear = periodsMeta?.currentYear ?? new Date().getFullYear()

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
      {!loading && !error && effectiveFrom && effectiveTo && (
        <SettlementDetailPeriodFilter
          filter={periodFilter}
          periodFrom={effectiveFrom}
          periodTo={effectiveTo}
          onChange={setPeriodFilter}
          settlementYear={settlementYear}
          firstYear={firstYear}
          currentYear={currentYear}
          isPeriodClosed={isPeriodClosed}
          onYearChange={handleYearChange}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <Outlet />
      )}
    </div>
  )
}

export default function SettlementReportLayout() {
  return (
    <SettlementReportProvider>
      <SettlementReportShell />
    </SettlementReportProvider>
  )
}
