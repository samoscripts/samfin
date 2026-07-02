import { useEffect, useState } from 'react'
import { MONTH_NAMES } from '@/shared/utils/monthQuery'
import { recentYears } from '@/shared/utils/periodUrl'
import { btnPrimary, inputCls } from '@/shared/components/form/formClasses'

export interface PeriodRangePreset {
  label: string
  dateFrom: string
  dateTo: string
  hint?: string
}

type PeriodMode = 'month' | 'range'

export interface PeriodPanelFormProps {
  year: number
  month: number
  dateFrom: string
  dateTo: string
  isCustomRange: boolean
  rangePresets?: PeriodRangePreset[]
  onApplyMonth: (year: number, month: number) => void
  onApplyRange: (dateFrom: string, dateTo: string) => void
}

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'month', label: 'Miesiąc' },
  { value: 'range', label: 'Zakres dat' },
]

export default function PeriodPanelForm({
  year,
  month,
  dateFrom,
  dateTo,
  isCustomRange,
  rangePresets = [],
  onApplyMonth,
  onApplyRange,
}: PeriodPanelFormProps) {
  const [mode, setMode] = useState<PeriodMode>(isCustomRange ? 'range' : 'month')
  const [draftYear, setDraftYear] = useState(year)
  const [draftMonth, setDraftMonth] = useState(month)
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => {
    setMode(isCustomRange ? 'range' : 'month')
    setDraftYear(year)
    setDraftMonth(month)
    setDraftFrom(dateFrom)
    setDraftTo(dateTo)
    setRangeError(null)
  }, [isCustomRange, year, month, dateFrom, dateTo])

  const years = recentYears()

  const handleApply = () => {
    if (mode === 'month') {
      onApplyMonth(draftYear, draftMonth)
      return
    }
    if (draftFrom > draftTo) {
      setRangeError('Data „Do” nie może być wcześniejsza niż „Od”.')
      return
    }
    onApplyRange(draftFrom, draftTo)
  }

  const applyPreset = (preset: PeriodRangePreset) => {
    setMode('range')
    setDraftFrom(preset.dateFrom)
    setDraftTo(preset.dateTo)
    setRangeError(null)
    onApplyRange(preset.dateFrom, preset.dateTo)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
        <div
          className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 gap-1"
          role="group"
          aria-label="Tryb wyboru okresu"
        >
          {MODE_OPTIONS.map((option) => {
            const selected = mode === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setMode(option.value)
                  setRangeError(null)
                }}
                className={[
                  'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors',
                  selected
                    ? 'bg-[#1c4230] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {mode === 'month' ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
              Rok
              <select
                className={inputCls}
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
              Miesiąc
              <select
                className={inputCls}
                value={draftMonth}
                onChange={(e) => setDraftMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Od
                <input
                  type="date"
                  className={inputCls}
                  value={draftFrom}
                  onChange={(e) => {
                    setDraftFrom(e.target.value)
                    setRangeError(null)
                  }}
                />
              </label>
              <label className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Do
                <input
                  type="date"
                  className={inputCls}
                  value={draftTo}
                  onChange={(e) => {
                    setDraftTo(e.target.value)
                    setRangeError(null)
                  }}
                />
              </label>
            </div>
            {rangeError && (
              <p className="text-xs text-red-600 dark:text-red-400">{rangeError}</p>
            )}
            {rangePresets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.hint}
                    onClick={() => applyPreset(preset)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={handleApply}
          className={[btnPrimary, 'w-full'].join(' ')}
        >
          Zastosuj
        </button>
      </div>
    </div>
  )
}
