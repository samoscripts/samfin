import { useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { fetchWallets, type Wallet } from '@/shared/api/wallets'
import ReportPeriodSection from '@/domains/home/reports/shared/components/ReportPeriodSection'
import ReportWalletSection from '@/domains/home/reports/shared/components/ReportWalletSection'
import type { ParsedReportPeriodState, ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'

const PANEL_WIDTH = 420

interface ReportScopeSidebarProps {
  open: boolean
  onClose: () => void
  title?: string
  period: ParsedReportPeriodState
  onPeriodModeChange: (mode: ReportPeriodMode) => void
  onPeriodNavigate: (direction: -1 | 1) => void
  onPeriodJumpToCurrent: () => void
  onPeriodRangeChange: (dateFrom: string, dateTo: string) => void
  walletId: string
  onWalletChange: (walletId: string) => void
}

export default function ReportScopeSidebar({
  open,
  onClose,
  title = 'Okres i portfel',
  period,
  onPeriodModeChange,
  onPeriodNavigate,
  onPeriodJumpToCurrent,
  onPeriodRangeChange,
  walletId,
  onWalletChange,
}: ReportScopeSidebarProps) {
  const isMobile = useIsMobile()
  const [wallets, setWallets] = useState<Wallet[]>([])

  useEffect(() => {
    if (!open) return
    fetchWallets().then(setWallets).catch(() => setWallets([]))
  }, [open])

  const header = (
    <div className="flex items-center gap-2 shrink-0 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
      <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const body = (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
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

  const inner = (
    <div className="flex flex-col h-full min-h-0">
      {header}
      {body}
    </div>
  )

  if (!open) return null

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
        <aside
          className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800"
          style={{ width: 'min(100vw, 28rem)' }}
        >
          {inner}
        </aside>
      </>
    )
  }

  return (
    <aside
      className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="flex flex-col h-full min-h-0" style={{ width: PANEL_WIDTH }}>
        {inner}
      </div>
    </aside>
  )
}
