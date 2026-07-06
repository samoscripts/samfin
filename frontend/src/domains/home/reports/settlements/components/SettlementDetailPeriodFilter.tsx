import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import SettlementPeriodSwitcher from '@/domains/home/reports/settlements/components/SettlementPeriodSwitcher'
import type { SettlementPeriodFilter, SettlementPeriodMode } from '@/domains/home/reports/settlements/utils/periodFilter'
import { isFullIndexPeriod, resolvePeriodBounds } from '@/domains/home/reports/settlements/utils/periodFilter'
import { SETTLEMENT_UI_LABELS } from '@/domains/home/reports/settlements/constants'
import { currentMonthParam, monthLabel, shiftMonth } from '@/shared/utils/monthQuery'
import { isCurrentMonthParam } from '@/shared/utils/periodUrl'
import { inputCls } from '@/shared/components/form/formClasses'

const MODE_OPTIONS: { value: SettlementPeriodMode; label: string }[] = [
  { value: 'full', label: 'Cały zakres' },
  { value: 'month', label: 'Miesiące' },
  { value: 'range', label: 'Zakres dat' },
]

const navBtnCls =
  'p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-default'

/** Stała wysokość panelu sterowania okresem (wszystkie tryby). */
const CONTROL_PANEL_CLS = 'h-[2.75rem] flex items-center'

export default function SettlementDetailPeriodFilter({
  filter,
  periodFrom,
  periodTo,
  onChange,
  settlementYear,
  firstYear,
  currentYear,
  isPeriodClosed,
  onYearChange,
}: {
  filter: SettlementPeriodFilter
  periodFrom: string
  periodTo: string
  onChange: (next: SettlementPeriodFilter) => void
  settlementYear: number
  firstYear: number
  currentYear: number
  isPeriodClosed: boolean
  onYearChange: (year: number) => void
}) {
  const bounds = resolvePeriodBounds(filter, periodFrom, periodTo)
  const showFullLabel = isFullIndexPeriod(filter, periodFrom, periodTo)

  const setMode = (mode: SettlementPeriodMode) => {
    if (mode === filter.mode) return
    onChange({
      ...filter,
      mode,
      monthParam: mode === 'month' ? currentMonthParam() : filter.monthParam,
      dateFrom: mode === 'range' ? bounds.dateFrom : filter.dateFrom,
      dateTo: mode === 'range' ? bounds.dateTo : filter.dateTo,
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tryb filtra okresu">
        {MODE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter.mode === value
                ? 'bg-[#c9a96e]/15 text-[#8a7340] dark:text-[#c9a96e] ring-1 ring-[#c9a96e]/35'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={CONTROL_PANEL_CLS}>
        {filter.mode === 'full' && (
          <SettlementPeriodSwitcher
            compact
            year={settlementYear}
            firstYear={firstYear}
            currentYear={currentYear}
            isClosed={isPeriodClosed}
            onYearChange={onYearChange}
          />
        )}

        {filter.mode === 'month' && (
          <div className="flex justify-start">
            <div className="inline-grid grid-cols-[auto_minmax(10rem,1fr)_auto_auto] items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...filter, monthParam: shiftMonth(filter.monthParam, -1) })
                }
                className={navBtnCls}
                aria-label="Poprzedni miesiąc"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center px-1 truncate">
                {monthLabel(filter.monthParam)}
              </span>

              <button
                type="button"
                onClick={() =>
                  onChange({ ...filter, monthParam: shiftMonth(filter.monthParam, 1) })
                }
                className={navBtnCls}
                aria-label="Następny miesiąc"
              >
                <ChevronRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => onChange({ ...filter, monthParam: currentMonthParam() })}
                disabled={isCurrentMonthParam(filter.monthParam)}
                className={[
                  navBtnCls,
                  isCurrentMonthParam(filter.monthParam) ? 'opacity-40 cursor-default' : '',
                ].join(' ')}
                aria-label="Bieżący miesiąc"
                title="Bieżący miesiąc"
              >
                <CalendarDays size={18} />
              </button>
            </div>
          </div>
        )}

        {filter.mode === 'range' && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">Od</span>
              <input
                type="date"
                value={filter.dateFrom}
                min={periodFrom}
                max={periodTo}
                onChange={(e) => onChange({ ...filter, dateFrom: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">Do</span>
              <input
                type="date"
                value={filter.dateTo}
                min={periodFrom}
                max={periodTo}
                onChange={(e) => onChange({ ...filter, dateTo: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>
        )}
      </div>

      {filter.mode === 'full' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {SETTLEMENT_UI_LABELS.settlementPeriodRange(periodFrom, periodTo)}
        </p>
      )}

      {!showFullLabel && filter.mode !== 'full' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Wyświetlany okres: {bounds.dateFrom} — {bounds.dateTo}
        </p>
      )}
    </div>
  )
}
