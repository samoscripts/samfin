import type { Props as DefaultLegendContentProps } from 'recharts/types/component/DefaultLegendContent'

export interface ChartLegendSeries {
  key: string
  label: string
  color: string
  fillOpacity?: number
}

interface ChartSeriesLegendProps {
  payload?: DefaultLegendContentProps['payload']
  series: ChartLegendSeries[]
}

function payloadDataKey(payload: NonNullable<DefaultLegendContentProps['payload']>[number]): string | undefined {
  const key = payload.dataKey
  if (key == null) return undefined
  return typeof key === 'string' || typeof key === 'number' ? String(key) : undefined
}

export function seriesColorByPayload(
  payload: NonNullable<DefaultLegendContentProps['payload']>[number] | undefined,
  series: ChartLegendSeries[],
): ChartLegendSeries | undefined {
  if (!payload) return undefined
  const dataKey = payloadDataKey(payload)
  if (dataKey) {
    const byKey = series.find((s) => s.key === dataKey)
    if (byKey) return byKey
  }
  const label = payload.value != null ? String(payload.value) : ''
  return series.find((s) => s.label === label)
}

export default function ChartSeriesLegend({ payload, series }: ChartSeriesLegendProps) {
  if (!payload?.length) return null

  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2">
      {payload.map((entry) => {
        const item = seriesColorByPayload(entry, series)
        const color = item?.color ?? (typeof entry.color === 'string' ? entry.color : '#6b7280')
        const fillOpacity = item?.fillOpacity ?? 1
        const label = item?.label ?? String(entry.value ?? '')

        return (
          <li
            key={`${entry.dataKey ?? label}`}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
          >
            <span
              className="w-3 h-3 rounded-sm shrink-0 border border-black/5 dark:border-white/10"
              style={{ backgroundColor: color, opacity: fillOpacity }}
            />
            <span>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
