import { describe, expect, it } from 'vitest'

import {
  isTrendChartTypeAvailable,
  parseTrendChartType,
  resolveTrendChartType,
  serializeTrendChartType,
} from '@/domains/home/reports/trend/utils/trendChartType'

describe('parseTrendChartType', () => {
  it('domyślnie bar', () => {
    expect(parseTrendChartType(null)).toBe('bar')
    expect(parseTrendChartType('invalid')).toBe('bar')
  })

  it('parsuje wszystkie typy', () => {
    expect(parseTrendChartType('line')).toBe('line')
    expect(parseTrendChartType('stacked')).toBe('stacked')
    expect(parseTrendChartType('heatmap')).toBe('heatmap')
  })
})

describe('serializeTrendChartType', () => {
  it('bar nie dodaje parametru chart', () => {
    const params = serializeTrendChartType('bar', new URLSearchParams({ chart: 'line' }))
    expect(params.get('chart')).toBeNull()
  })

  it('stacked zapisuje chart=stacked', () => {
    const params = serializeTrendChartType('stacked', new URLSearchParams())
    expect(params.get('chart')).toBe('stacked')
  })
})

describe('resolveTrendChartType', () => {
  it('stacked → bar przy jednym kierunku', () => {
    expect(resolveTrendChartType('stacked', ['EXPENSE'], 'none')).toBe('bar')
    expect(resolveTrendChartType('stacked', ['EXPENSE'], 'category')).toBe('bar')
  })

  it('stacked dozwolony przy obu kierunkach', () => {
    expect(resolveTrendChartType('stacked', ['EXPENSE', 'INCOME'], 'category')).toBe('stacked')
  })

  it('heatmap → bar gdy brak serii', () => {
    expect(resolveTrendChartType('heatmap', ['EXPENSE', 'INCOME'], 'none')).toBe('bar')
  })

  it('heatmap dozwolona przy porównaniu serii', () => {
    expect(resolveTrendChartType('heatmap', ['EXPENSE'], 'category')).toBe('heatmap')
  })

  it('line pozostaje line', () => {
    expect(resolveTrendChartType('line', ['EXPENSE'], 'none')).toBe('line')
  })
})

describe('isTrendChartTypeAvailable', () => {
  it('diverging wymaga obu kierunków', () => {
    expect(isTrendChartTypeAvailable('diverging', ['EXPENSE'], 'category')).toBe(false)
    expect(isTrendChartTypeAvailable('diverging', ['EXPENSE', 'INCOME'], 'category')).toBe(true)
  })
})
