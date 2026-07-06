import { Minus, Plus } from 'lucide-react'
import {
  CHART_TOP_MAX,
  CHART_TOP_MIN,
} from '@/domains/home/reports/shared/utils/chartTopGroups'

const stepBtnCls =
  'p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-default transition-colors'

interface ReportChartTopSectionProps {
  value: number
  groupCount: number
  onChange: (value: number) => void
}

export default function ReportChartTopSection({
  value,
  groupCount,
  onChange,
}: ReportChartTopSectionProps) {
  const maxAllowed = Math.min(CHART_TOP_MAX, Math.max(groupCount, CHART_TOP_MIN))
  const canDecrease = value > CHART_TOP_MIN
  const canIncrease = value < maxAllowed

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Top na wykresie
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={!canDecrease}
          className={stepBtnCls}
          aria-label="Zmniejsz liczbę pozycji"
        >
          <Minus size={16} />
        </button>
        <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100 min-w-[2ch] text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={!canIncrease}
          className={stepBtnCls}
          aria-label="Zwiększ liczbę pozycji"
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Ostatnia pozycja: Pozostałe (gdy jest więcej grup)
      </p>
    </div>
  )
}
