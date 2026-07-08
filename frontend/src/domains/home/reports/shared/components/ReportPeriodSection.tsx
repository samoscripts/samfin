import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import ClearableDateInput from '@/shared/components/form/ClearableDateInput'
import { ReportPeriodModeToggle } from '@/domains/home/reports/shared/components/ReportSidebarSections'
import type { ReportPeriodMode, ParsedReportPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'
import { periodNavigatorLabel } from '@/domains/home/reports/shared/utils/reportPeriod'
import {
  currentYearMonth,
  isCurrentMonthParam,
} from '@/shared/utils/periodUrl'

const navBtnCls =
  'p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-default'

interface ReportPeriodSectionProps {
  period: ParsedReportPeriodState
  onModeChange: (mode: ReportPeriodMode) => void
  onNavigate: (direction: -1 | 1) => void
  onJumpToCurrent: () => void
  onRangeChange: (dateFrom: string, dateTo: string) => void
}

export default function ReportPeriodSection({
  period,
  onModeChange,
  onNavigate,
  onJumpToCurrent,
  onRangeChange,
}: ReportPeriodSectionProps) {
  const defaults = currentYearMonth()
  const isCurrentMonth =
    period.mode === 'month' && isCurrentMonthParam(period.monthParam)
  const isCurrentYear = period.mode === 'year' && period.year === defaults.year
  const currentQuarter = Math.ceil(defaults.month / 3)
  const isCurrentQuarter =
    period.mode === 'quarter' &&
    period.year === defaults.year &&
    period.quarter === currentQuarter

  const canJumpToCurrent =
    (period.mode === 'month' && !isCurrentMonth) ||
    (period.mode === 'year' && !isCurrentYear) ||
    (period.mode === 'quarter' && !isCurrentQuarter)

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Okres
      </p>

      <ReportPeriodModeToggle
        value={period.mode}
        onChange={(mode) => onModeChange(mode as ReportPeriodMode)}
      />

      {period.mode === 'range' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-500">
            Od
            <ClearableDateInput
              value={period.dateFrom}
              onChange={(dateFrom) => onRangeChange(dateFrom, period.dateTo)}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-500">
            Do
            <ClearableDateInput
              value={period.dateTo}
              onChange={(dateTo) => onRangeChange(period.dateFrom, dateTo)}
              className="mt-1"
            />
          </label>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="inline-grid grid-cols-[auto_minmax(8rem,1fr)_auto_auto] items-center gap-2 w-full max-w-sm">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              className={navBtnCls}
              aria-label="Poprzedni okres"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center px-1 truncate">
              {periodNavigatorLabel(period)}
            </span>

            <button
              type="button"
              onClick={() => onNavigate(1)}
              className={navBtnCls}
              aria-label="Następny okres"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              onClick={onJumpToCurrent}
              disabled={!canJumpToCurrent}
              className={[navBtnCls, !canJumpToCurrent ? 'opacity-40 cursor-default' : ''].join(' ')}
              aria-label="Bieżący okres"
              title="Bieżący okres"
            >
              <CalendarDays size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
