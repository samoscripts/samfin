import type { TrendChartType, TrendDirection, TrendSeriesBy } from '@/domains/home/reports/trend/types/trend'
import {
  isTrendChartTypeAvailable,
  TREND_CHART_TYPE_OPTIONS,
} from '@/domains/home/reports/trend/utils/trendChartType'

interface TrendChartTypeTabsProps {
  value: TrendChartType
  directions: TrendDirection[]
  seriesBy: TrendSeriesBy
  onChange: (type: TrendChartType) => void
}

export default function TrendChartTypeTabs({
  value,
  directions,
  seriesBy,
  onChange,
}: TrendChartTypeTabsProps) {
  const visibleOptions = TREND_CHART_TYPE_OPTIONS.filter((option) =>
    isTrendChartTypeAvailable(option.id, directions, seriesBy),
  )

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
      {visibleOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0',
            value === option.id
              ? 'bg-[#163526] text-white dark:bg-[#c9a96e] dark:text-[#163526]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
