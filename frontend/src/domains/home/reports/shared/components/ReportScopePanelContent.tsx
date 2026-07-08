import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import ReportPeriodSection from '@/domains/home/reports/shared/components/ReportPeriodSection'
import ReportWalletSection from '@/domains/home/reports/shared/components/ReportWalletSection'
import type { ParsedReportPeriodState, ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import { isReportPanelOpen } from '@/domains/home/reports/shared/utils/reportPanelUrl'

interface ReportScopePanelContentProps {
  period: ParsedReportPeriodState
  onPeriodModeChange: (mode: ReportPeriodMode) => void
  onPeriodNavigate: (direction: -1 | 1) => void
  onPeriodJumpToCurrent: () => void
  onPeriodRangeChange: (dateFrom: string, dateTo: string) => void
  walletId: string
  onWalletChange: (walletId: string) => void
}

export default function ReportScopePanelContent({
  period,
  onPeriodModeChange,
  onPeriodNavigate,
  onPeriodJumpToCurrent,
  onPeriodRangeChange,
  walletId,
  onWalletChange,
}: ReportScopePanelContentProps) {
  const [searchParams] = useSearchParams()
  const panelOpen = isReportPanelOpen(searchParams)
  const [wallets, setWallets] = useState<Wallet[]>([])

  useEffect(() => {
    if (!panelOpen) return
    fetchWallets().then(setWallets).catch(() => setWallets([]))
  }, [panelOpen])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-6">
      <ReportPeriodSection
        period={period}
        onModeChange={onPeriodModeChange}
        onNavigate={onPeriodNavigate}
        onJumpToCurrent={onPeriodJumpToCurrent}
        onRangeChange={onPeriodRangeChange}
      />

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <ReportWalletSection
        wallets={wallets}
        walletId={walletId}
        onChange={onWalletChange}
      />
    </div>
  )
}
