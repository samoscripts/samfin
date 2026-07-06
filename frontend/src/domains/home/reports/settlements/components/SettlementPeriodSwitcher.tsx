import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { SETTLEMENT_UI_LABELS } from '@/domains/home/reports/settlements/constants'

const navBtnCls =
  'p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-default'

export default function SettlementPeriodSwitcher({
  year,
  firstYear,
  currentYear,
  isClosed,
  onYearChange,
  compact = false,
}: {
  year: number
  firstYear: number
  currentYear: number
  isClosed: boolean
  onYearChange: (year: number) => void
  compact?: boolean
}) {
  const canGoPrev = year > firstYear
  const canGoNext = year < currentYear
  const isCurrentYear = year === currentYear

  const navigator = (
    <div className="inline-grid grid-cols-[auto_minmax(10rem,1fr)_auto_auto] items-center gap-2">
      <button
        type="button"
        onClick={() => onYearChange(year - 1)}
        disabled={!canGoPrev}
        className={navBtnCls}
        aria-label={SETTLEMENT_UI_LABELS.prevYear}
      >
        <ChevronLeft size={18} />
      </button>

      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center px-1 truncate">
        {SETTLEMENT_UI_LABELS.settlementPeriod} {year}
      </span>

      <button
        type="button"
        onClick={() => onYearChange(year + 1)}
        disabled={!canGoNext}
        className={navBtnCls}
        aria-label={SETTLEMENT_UI_LABELS.nextYear}
      >
        <ChevronRight size={18} />
      </button>

      <button
        type="button"
        onClick={() => onYearChange(currentYear)}
        disabled={isCurrentYear}
        className={[navBtnCls, isCurrentYear ? 'opacity-40 cursor-default' : ''].join(' ')}
        aria-label={SETTLEMENT_UI_LABELS.goToCurrentYear}
        title={SETTLEMENT_UI_LABELS.goToCurrentYear}
      >
        <CalendarDays size={18} />
      </button>
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {navigator}
        {isClosed && (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {SETTLEMENT_UI_LABELS.settlementPeriodClosed}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 justify-between">
      <div className="flex justify-start">{navigator}</div>
      {isClosed && (
        <span className="inline-flex self-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {SETTLEMENT_UI_LABELS.settlementPeriodClosed}
        </span>
      )}
    </div>
  )
}
