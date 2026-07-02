import { type RefObject } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { type PeriodRangePreset } from '@/shared/components/PeriodPanelForm'
import { currentMonthParam, monthLabel, shiftMonth } from '@/shared/utils/monthQuery'
import {
  formatDateRangeLabel,
  isCurrentMonthParam,
} from '@/shared/utils/periodUrl'

export type { PeriodRangePreset }

export interface PeriodNavigatorProps {
  monthParam: string
  isCustomRange: boolean
  dateFrom: string
  dateTo: string
  showAdvanced?: boolean
  advancedOpen?: boolean
  onOpenAdvanced?: () => void
  advancedButtonRef?: RefObject<HTMLButtonElement | null>
  rangePresets?: PeriodRangePreset[]
  onMonthChange: (monthParam: string) => void
  onRangeChange?: (dateFrom: string, dateTo: string) => void
  onApplyMonthPick?: (year: number, month: number) => void
  className?: string
}

const navBtnCls =
  'p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0'

export default function PeriodNavigator({
  monthParam,
  isCustomRange,
  dateFrom,
  dateTo,
  showAdvanced = false,
  advancedOpen = false,
  onOpenAdvanced,
  advancedButtonRef,
  className,
  onMonthChange,
}: PeriodNavigatorProps) {
  const label = isCustomRange
    ? formatDateRangeLabel(dateFrom, dateTo)
    : monthLabel(monthParam)

  const isCurrentMonth = !isCustomRange && isCurrentMonthParam(monthParam)

  const handlePrev = () => {
    const base = isCustomRange ? dateFrom.slice(0, 7) : monthParam
    onMonthChange(shiftMonth(base, -1))
  }

  const handleNext = () => {
    const base = isCustomRange ? dateFrom.slice(0, 7) : monthParam
    onMonthChange(shiftMonth(base, 1))
  }

  const handleToday = () => {
    onMonthChange(currentMonthParam())
  }

  return (
    <div className={['flex justify-center', className].filter(Boolean).join(' ')}>
      <div className="inline-grid grid-cols-[auto_minmax(10rem,1fr)_auto_auto_auto] items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          className={navBtnCls}
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft size={18} />
        </button>

        <span
          className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center px-1 truncate"
          title={label}
        >
          {label}
        </span>

        <button
          type="button"
          onClick={handleNext}
          className={navBtnCls}
          aria-label="Następny miesiąc"
        >
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          onClick={handleToday}
          disabled={isCurrentMonth}
          className={[
            navBtnCls,
            isCurrentMonth ? 'opacity-40 cursor-default' : '',
          ].join(' ')}
          aria-label="Bieżący miesiąc"
          title="Bieżący miesiąc"
        >
          <CalendarDays size={18} />
        </button>

        {showAdvanced && onOpenAdvanced && (
          <button
            ref={advancedButtonRef}
            type="button"
            onClick={onOpenAdvanced}
            aria-pressed={advancedOpen}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors shrink-0',
              advancedOpen
                ? 'border-[#c9a96e]/50 bg-[#c9a96e]/10 text-[#8a7340] dark:text-[#c9a96e]'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            ].join(' ')}
            aria-label="Więcej opcji okresu"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Więcej</span>
          </button>
        )}
      </div>
    </div>
  )
}
