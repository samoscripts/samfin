import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CHART_STYLE_URL_PARAM,
  parseChartStyle,
  readStoredChartStyle,
  writeStoredChartStyle,
  type ChartStyle,
} from '@/shared/components/charts/chartStyle'

export function useChartStyle(): [ChartStyle, (style: ChartStyle) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const chartStyle = useMemo(() => {
    const fromUrl = searchParams.get(CHART_STYLE_URL_PARAM)
    if (fromUrl) return parseChartStyle(fromUrl)
    return readStoredChartStyle()
  }, [searchParams])

  const setChartStyle = useCallback(
    (style: ChartStyle) => {
      writeStoredChartStyle(style)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set(CHART_STYLE_URL_PARAM, style)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [chartStyle, setChartStyle]
}
