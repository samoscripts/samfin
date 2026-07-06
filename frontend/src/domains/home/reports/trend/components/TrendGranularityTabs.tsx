import type { ReportPeriodMode } from '@/domains/home/reports/shared/utils/reportPeriod'
import type { TrendGranularity } from '@/domains/home/reports/trend/types/trend'
import {
  availableTrendGranularities,
  trendGranularityLabel,
} from '@/domains/home/reports/trend/utils/trendGranularity'

interface TrendGranularityTabsProps {
  periodMode: ReportPeriodMode
  value: TrendGranularity
  onChange: (granularity: TrendGranularity) => void
}

export default function TrendGranularityTabs({
  periodMode,
  value,
  onChange,
}: TrendGranularityTabsProps) {
  const options = availableTrendGranularities(periodMode)
  if (!options) return null

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Podział czasu">
      {options.map((granularity) => (
        <button
          key={granularity}
          type="button"
          onClick={() => onChange(granularity)}
          className={[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            value === granularity
              ? 'bg-[#163526] text-white dark:bg-[#c9a96e] dark:text-[#163526]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
          ].join(' ')}
          aria-pressed={value === granularity}
        >
          {trendGranularityLabel(granularity)}
        </button>
      ))}
    </div>
  )
}
