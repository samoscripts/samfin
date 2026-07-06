import { useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { useTheme } from '@/app/providers/ThemeProvider'
import PeriodNavigator from '@/shared/components/PeriodNavigator'
import PeriodSidebar from '@/shared/components/PeriodSidebar'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import { formatAmount } from '@/shared/utils/format'
import {
  currentYearMonth,
  parseReportPeriod,
  paramToYearMonth,
  serializeReportMonthPeriod,
  serializeReportRangePeriod,
  withReportPeriodPanel,
} from '@/shared/utils/periodUrl'
import MockBanner from '@/domains/home/reports/shared/components/MockBanner'
import { getTrendMockData } from '@/domains/home/reports/trend/fixtures/trend.fixture'

export default function TrendReport() {
  const periodTriggerRef = useRef<HTMLButtonElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const portalRoot = useRightPanelPortal()
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)

  const defaults = useMemo(() => currentYearMonth(), [])
  const period = useMemo(() => parseReportPeriod(searchParams, defaults), [searchParams, defaults])
  const periodPanelOpen = searchParams.get('panel') === 'period'
  const chartType = searchParams.get('chart') === 'bar' ? 'bar' : 'line'

  const data = useMemo(
    () => getTrendMockData(period.dateFrom, period.dateTo),
    [period.dateFrom, period.dateTo],
  )

  const handleMonthChange = useCallback(
    (monthParam: string) => {
      const ym = paramToYearMonth(monthParam)
      if (!ym) return
      setSearchParams(serializeReportMonthPeriod(ym.year, ym.month, defaults), { replace: true })
    },
    [defaults, setSearchParams],
  )

  const openPeriodPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('panel', 'period')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const closePeriodPanel = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('panel')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const handleApplyMonthPick = useCallback(
    (year: number, month: number) => {
      const params = withReportPeriodPanel(
        serializeReportMonthPeriod(year, month, defaults),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [defaults, setSearchParams, periodPanelOpen],
  )

  const handleRangeChange = useCallback(
    (dateFrom: string, dateTo: string) => {
      const params = withReportPeriodPanel(
        serializeReportRangePeriod(dateFrom, dateTo),
        periodPanelOpen,
      )
      setSearchParams(params, { replace: true })
    },
    [setSearchParams, periodPanelOpen],
  )

  const toggleChart = useCallback(
    (type: 'line' | 'bar') => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (type === 'line') params.delete('chart')
        else params.set('chart', 'bar')
        return params
      }, { replace: true })
    },
    [setSearchParams],
  )

  return (
    <>
      <div className="space-y-5">
        <MockBanner />

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <PeriodNavigator
            monthParam={period.monthParam}
            isCustomRange={period.isCustomRange}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            showAdvanced
            advancedOpen={periodPanelOpen}
            onOpenAdvanced={openPeriodPanel}
            advancedButtonRef={periodTriggerRef}
            onMonthChange={handleMonthChange}
          />
          <div className="flex gap-1.5">
            {(['line', 'bar'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleChart(type)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  chartType === type
                    ? 'bg-[#163526] text-white dark:bg-[#c9a96e] dark:text-[#163526]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                ].join(' ')}
              >
                {type === 'line' ? 'Liniowy' : 'Słupkowy'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Trend miesięczny · {data.dateFrom} — {data.dateTo}
        </p>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={360}>
            {chartType === 'line' ? (
              <LineChart data={data.points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
                <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{
                    background: theme.tooltipBg,
                    border: `1px solid ${theme.tooltipBorder}`,
                    borderRadius: 8,
                  }}
                  formatter={(value: number) => formatAmount(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="income" name="Przychody" stroke="#2d6a4f" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Wydatki" stroke="#c0392b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="balance" name="Saldo" stroke="#c9a96e" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={data.points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
                <YAxis tick={{ fill: theme.tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: theme.tooltipBg,
                    border: `1px solid ${theme.tooltipBorder}`,
                    borderRadius: 8,
                  }}
                  formatter={(value: number) => formatAmount(value)}
                />
                <Legend />
                <Bar dataKey="income" name="Przychody" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Wydatki" fill="#c0392b" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {portalRoot &&
        createPortal(
          <PeriodSidebar
            open={periodPanelOpen}
            onClose={closePeriodPanel}
            year={period.year}
            month={period.month}
            dateFrom={period.dateFrom}
            dateTo={period.dateTo}
            isCustomRange={period.isCustomRange}
            onApplyMonth={handleApplyMonthPick}
            onApplyRange={handleRangeChange}
            returnFocusRef={periodTriggerRef}
          />,
          portalRoot,
        )}
    </>
  )
}
