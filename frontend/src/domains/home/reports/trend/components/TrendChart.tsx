import { useCallback, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'
import ChartSeriesLegend, {
  type ChartLegendSeries,
} from '@/shared/components/charts/ChartSeriesLegend'
import type { Props as DefaultLegendContentProps } from 'recharts/types/component/DefaultLegendContent'
import {
  CHART_PAIRED_BAR_GAP,
  getPairedBarRadius,
  getSeriesDisplayColor,
  getTrendBarCellPaint,
} from '@/shared/components/charts/chartDirectionBarStyle'
import { chartThemeColors } from '@/shared/components/charts/chartColors'
import { chartBarCommonProps, trendBarCellId } from '@/shared/components/charts/chartBarShared'
import ChartHoverPanel, { type ChartHoverPayload } from '@/shared/components/charts/ChartHoverPanel'
import ChartHeatmap from '@/shared/components/charts/ChartHeatmap'
import { buildTrendHeatmapData } from '@/shared/components/charts/buildDirectionChartSeries'
import type { DirectionChartSelection } from '@/shared/components/charts/directionChartTypes'
import type {
  TrendBarSelection,
  TrendChartType,
  TrendDirection,
  TrendReportData,
} from '@/domains/home/reports/trend/types/trend'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import { formatTrendPeriodLabel } from '@/domains/home/reports/trend/utils/trendUrl'

export interface TrendChartLine {
  dataKey: string
  name: string
  color: string
  fillOpacity: number
  colorIndex: number
  strokeDasharray?: string
  direction: TrendDirection
  seriesName: string
  stackId?: string
}

function buildChartLines(
  data: TrendReportData,
  directions: TrendDirection[],
  chartStyle: ChartStyle,
  chartType: TrendChartType,
): TrendChartLine[] {
  const lines: TrendChartLine[] = []
  const showIncome = directions.includes('INCOME')
  const showExpense = directions.includes('EXPENSE')
  const useStack = chartType === 'stacked'

  if (data.seriesBy === 'none') {
    let colorIdx = 0
    const stackId = useStack ? 'total' : undefined
    if (showExpense) {
      const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, 'EXPENSE', colorIdx)
      lines.push({
        dataKey: 'total_expenses',
        name: DIRECTION_LABEL_BY_VALUE.EXPENSE,
        color: fill,
        colorIndex: colorIdx++,
        fillOpacity,
        direction: 'EXPENSE',
        seriesName: 'Razem',
        stackId,
      })
    }
    if (showIncome) {
      const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, 'INCOME', colorIdx)
      lines.push({
        dataKey: 'total_income',
        name: DIRECTION_LABEL_BY_VALUE.INCOME,
        color: fill,
        colorIndex: colorIdx,
        fillOpacity,
        strokeDasharray: '6 3',
        direction: 'INCOME',
        seriesName: 'Razem',
        stackId,
      })
    }
    return lines
  }

  const seriesList = data.points[0]?.series ?? []
  seriesList.forEach((series, index) => {
    const stackId = useStack ? series.id : undefined
    if (showExpense) {
      const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, 'EXPENSE', index)
      lines.push({
        dataKey: `${series.id}_expenses`,
        name: `${series.name} — ${DIRECTION_LABEL_BY_VALUE.EXPENSE}`,
        color: fill,
        colorIndex: index,
        fillOpacity,
        direction: 'EXPENSE',
        seriesName: series.name,
        stackId,
      })
    }
    if (showIncome) {
      const { fill, fillOpacity } = getSeriesDisplayColor(chartStyle, 'INCOME', index)
      lines.push({
        dataKey: `${series.id}_income`,
        name: `${series.name} — ${DIRECTION_LABEL_BY_VALUE.INCOME}`,
        color: fill,
        colorIndex: index,
        fillOpacity,
        strokeDasharray: '6 3',
        direction: 'INCOME',
        seriesName: series.name,
        stackId,
      })
    }
  })

  return lines
}

function buildChartRows(data: TrendReportData): Record<string, string | number>[] {
  return data.points.map((point) => {
    const row: Record<string, string | number> = {
      label: point.label,
      period: point.period,
    }
    if (data.seriesBy === 'none') {
      row.total_income = point.totals.income
      row.total_expenses = point.totals.expenses
    } else {
      for (const s of point.series) {
        row[`${s.id}_income`] = s.income
        row[`${s.id}_expenses`] = s.expenses
      }
    }
    return row
  })
}

function buildDivergingRows(
  rows: Record<string, string | number>[],
  lines: TrendChartLine[],
): Record<string, string | number>[] {
  const expenseKeys = new Set(
    lines.filter((l) => l.direction === 'EXPENSE').map((l) => l.dataKey),
  )
  return rows.map((row) => {
    const out = { ...row }
    for (const key of expenseKeys) {
      const raw = Number(row[key] ?? 0)
      out[key] = raw > 0 ? -raw : 0
    }
    return out
  })
}

function heatmapToTrendSelection(
  selection: DirectionChartSelection,
  data: TrendReportData,
): TrendBarSelection {
  const sep = selection.id.indexOf('::')
  const seriesId = sep >= 0 ? selection.id.slice(0, sep) : selection.id
  const period = sep >= 0 ? selection.id.slice(sep + 2) : ''
  const dataKey =
    data.seriesBy === 'none'
      ? `total_${selection.direction === 'EXPENSE' ? 'expenses' : 'income'}`
      : `${seriesId}_${selection.direction === 'EXPENSE' ? 'expenses' : 'income'}`

  const point = data.points.find((p) => p.period === period)
  const seriesName =
    data.seriesBy === 'none'
      ? 'Razem'
      : (point?.series.find((s) => s.id === seriesId)?.name ?? seriesId)

  const colorIndex =
    data.seriesBy === 'none'
      ? 0
      : Math.max(0, data.points[0]?.series.findIndex((s) => s.id === seriesId) ?? 0)

  return {
    period,
    periodLabel: formatTrendPeriodLabel(period),
    dataKey,
    seriesName,
    direction: selection.direction,
    amount: selection.amount,
    colorIndex,
  }
}

interface TrendChartProps {
  data: TrendReportData
  chartType: TrendChartType
  directions: TrendDirection[]
  chartStyle: ChartStyle
  activeBar?: TrendBarSelection | null
  onBarClick?: (selection: TrendBarSelection) => void
}

export default function TrendChart({
  data,
  chartType,
  directions,
  chartStyle,
  activeBar,
  onBarClick,
}: TrendChartProps) {
  const { effective } = useTheme()
  const theme = chartThemeColors(effective)
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const [hoverPayload, setHoverPayload] = useState<ChartHoverPayload | null>(null)

  const rows = useMemo(() => buildChartRows(data), [data])
  const lines = useMemo(
    () => buildChartLines(data, directions, chartStyle, chartType),
    [data, directions, chartStyle, chartType],
  )
  const bothDirections = directions.includes('INCOME') && directions.includes('EXPENSE')

  const visibleLines = useMemo(() => {
    return lines.filter((line) => {
      if (line.dataKey.endsWith('_income')) return directions.includes('INCOME')
      if (line.dataKey.endsWith('_expenses')) return directions.includes('EXPENSE')
      return true
    })
  }, [lines, directions])

  const divergingRows = useMemo(
    () => (chartType === 'diverging' ? buildDivergingRows(rows, visibleLines) : rows),
    [chartType, rows, visibleLines],
  )

  const legendSeries = useMemo<ChartLegendSeries[]>(
    () =>
      visibleLines.map((line) => ({
        key: line.dataKey,
        label: line.name,
        color: line.color,
        fillOpacity: line.fillOpacity,
      })),
    [visibleLines],
  )

  const renderLegend = useCallback(
    (props: DefaultLegendContentProps) => (
      <ChartSeriesLegend payload={props.payload} series={legendSeries} />
    ),
    [legendSeries],
  )

  const activeCellId = activeBar ? trendBarCellId(activeBar.period, activeBar.dataKey) : null

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-sm text-gray-400">
        Brak danych w wybranym okresie
      </div>
    )
  }

  const periodDisplayLabel = (row: Record<string, string | number>) =>
    formatTrendPeriodLabel(String(row.period))

  const handleBarClick = (row: Record<string, string | number>, line: TrendChartLine) => {
    const raw = Number(row[line.dataKey] ?? 0)
    const amount = chartType === 'diverging' && line.direction === 'EXPENSE' ? Math.abs(raw) : raw
    if (!onBarClick || amount <= 0) return
    onBarClick({
      period: String(row.period),
      periodLabel: periodDisplayLabel(row),
      dataKey: line.dataKey,
      seriesName: line.seriesName,
      direction: line.direction,
      amount,
      colorIndex: line.colorIndex,
    })
  }

  const handlePointHover = (row: Record<string, string | number>, line: TrendChartLine) => {
    const raw = Number(row[line.dataKey] ?? 0)
    const amount = chartType === 'diverging' && line.direction === 'EXPENSE' ? Math.abs(raw) : raw
    setHoveredCellId(trendBarCellId(String(row.period), line.dataKey))
    setHoverPayload({
      label: `${periodDisplayLabel(row)} · ${line.name}`,
      value: amount,
    })
  }

  const clearPointHover = () => {
    setHoveredCellId(null)
    setHoverPayload(null)
  }

  const yTickFormatter =
    chartType === 'diverging' ? (v: number) => `${Math.abs(v)}` : (v: number) => `${v}`

  const LINE_DOT_HIT_RADIUS = 8
  const LINE_DOT_VISIBLE_RADIUS = 4

  const renderLineDot =
    (line: TrendChartLine) =>
    (props: { cx?: number; cy?: number; payload?: Record<string, string | number> }) => {
      const { cx, cy, payload } = props
      if (cx == null || cy == null || !payload) {
        return <circle cx={0} cy={0} r={0} fill="transparent" aria-hidden />
      }

      const cellId = trendBarCellId(String(payload.period), line.dataKey)
      const isHovered = hoveredCellId === cellId

      return (
        <circle
          cx={cx}
          cy={cy}
          r={isHovered ? LINE_DOT_VISIBLE_RADIUS : LINE_DOT_HIT_RADIUS}
          fill={isHovered ? theme.tooltipBg : 'transparent'}
          stroke={isHovered ? line.color : 'transparent'}
          strokeWidth={isHovered ? 2 : 0}
          strokeOpacity={isHovered ? line.fillOpacity : 0}
          onMouseEnter={() => handlePointHover(payload, line)}
          onMouseLeave={clearPointHover}
          onClick={() => handleBarClick(payload, line)}
          className={onBarClick ? 'cursor-pointer' : undefined}
        />
      )
    }

  const renderBarCells = (line: TrendChartLine) =>
    rows.map((row) => {
      const cellId = trendBarCellId(String(row.period), line.dataKey)
      const paint = getTrendBarCellPaint({
        direction: line.direction,
        colorIndex: line.colorIndex,
        chartStyle,
        cellId,
        activeCellId,
        hoveredCellId,
      })
      return (
        <Cell
          key={cellId}
          fill={paint.fill}
          fillOpacity={paint.fillOpacity}
          stroke={paint.stroke}
          strokeWidth={paint.strokeWidth}
        />
      )
    })

  const barChartData = chartType === 'diverging' ? divergingRows : rows
  const isGroupedBar = chartType === 'bar'

  const chartContent =
    chartType === 'heatmap' ? (
      <div className="space-y-6">
        {directions.includes('EXPENSE') && (
          <ChartHeatmap
            {...buildTrendHeatmapData(data, 'EXPENSE')}
            direction="EXPENSE"
            chartStyle={chartStyle}
            onCellClick={
              onBarClick ? (sel) => onBarClick(heatmapToTrendSelection(sel, data)) : undefined
            }
            sectionLabel="Wydatki · heatmapa"
          />
        )}
        {directions.includes('INCOME') && (
          <ChartHeatmap
            {...buildTrendHeatmapData(data, 'INCOME')}
            direction="INCOME"
            chartStyle={chartStyle}
            onCellClick={
              onBarClick ? (sel) => onBarClick(heatmapToTrendSelection(sel, data)) : undefined
            }
            sectionLabel="Wpływy · heatmapa"
          />
        )}
      </div>
    ) : chartType === 'line' ? (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={(v) => `${v}`} />
          <Legend content={renderLegend} />
          {visibleLines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeOpacity={line.fillOpacity}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={renderLineDot(line)}
              activeDot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    ) : chartType === 'area' ? (
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={(v) => `${v}`} />
          <Legend content={renderLegend} />
          {visibleLines.map((line) => (
            <Area
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeOpacity={line.fillOpacity}
              fill={line.color}
              fillOpacity={line.fillOpacity * 0.35}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={renderLineDot(line)}
              activeDot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    ) : (
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={barChartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          barGap={isGroupedBar && bothDirections ? CHART_PAIRED_BAR_GAP : 4}
          barCategoryGap={isGroupedBar && bothDirections ? '18%' : '12%'}
        >
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} tickFormatter={yTickFormatter} />
          <Legend content={renderLegend} />
          {visibleLines.map((line) => (
            <Bar
              key={line.dataKey}
              dataKey={line.dataKey}
              name={line.name}
              fill={line.color}
              fillOpacity={line.fillOpacity}
              stackId={chartType === 'stacked' ? line.stackId : undefined}
              radius={
                isGroupedBar
                  ? getPairedBarRadius(line.direction, bothDirections)
                  : [4, 4, 0, 0]
              }
              {...chartBarCommonProps()}
              className={onBarClick ? 'cursor-pointer' : undefined}
              onClick={(row) => handleBarClick(row as Record<string, string | number>, line)}
              onMouseEnter={(row) =>
                handlePointHover(row as Record<string, string | number>, line)
              }
              onMouseLeave={clearPointHover}
            >
              {renderBarCells(line)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    )

  const emptyLabel =
    chartType === 'line' || chartType === 'area'
      ? 'Najedź na punkt'
      : chartType === 'heatmap'
        ? 'Najedź na komórkę'
        : 'Najedź na słupek'

  return (
    <ChartHoverPanel payload={chartType === 'heatmap' ? null : hoverPayload} emptyLabel={emptyLabel}>
      {chartContent}
    </ChartHoverPanel>
  )
}
