import { describe, expect, it } from 'vitest'

import {
  defaultBreakdownChartTab,
  isBreakdownChartTabAvailable,
  parseBreakdownChartTab,
  resolveBreakdownChartTab,
  serializeBreakdownChartTab,
  visibleBreakdownChartTabs,
} from '@/domains/home/reports/breakdown/utils/breakdownChartType'

describe('parseBreakdownChartTab', () => {
  it('akceptuje znane taby', () => {
    expect(parseBreakdownChartTab('stacked')).toBe('stacked')
    expect(parseBreakdownChartTab('donut')).toBe('donut')
  })

  it('zwraca null dla nieznanego lub pustego', () => {
    expect(parseBreakdownChartTab('heatmap')).toBeNull()
    expect(parseBreakdownChartTab(null)).toBeNull()
  })
})

describe('defaultBreakdownChartTab', () => {
  it('vertical przy jednym kierunku, stacked przy obu', () => {
    expect(defaultBreakdownChartTab(['EXPENSE'])).toBe('vertical')
    expect(defaultBreakdownChartTab(['EXPENSE', 'INCOME'])).toBe('stacked')
  })
})

describe('resolveBreakdownChartTab', () => {
  it('koercuje donut → stacked przy obu kierunkach', () => {
    expect(resolveBreakdownChartTab('donut', ['EXPENSE', 'INCOME'])).toBe('stacked')
  })

  it('koercuje stacked → vertical przy jednym kierunku', () => {
    expect(resolveBreakdownChartTab('stacked', ['INCOME'])).toBe('vertical')
  })

  it('zachowuje dozwolony tab', () => {
    expect(resolveBreakdownChartTab('grouped', ['EXPENSE', 'INCOME'])).toBe('grouped')
    expect(resolveBreakdownChartTab('horizontal', ['EXPENSE'])).toBe('horizontal')
  })
})

describe('visibleBreakdownChartTabs', () => {
  it('pokazuje inne zestawy tabów zależnie od kierunku', () => {
    expect(visibleBreakdownChartTabs(['EXPENSE'])).toEqual([
      'vertical',
      'horizontal',
      'donut',
      'table',
    ])
    expect(visibleBreakdownChartTabs(['EXPENSE', 'INCOME'])).toEqual([
      'stacked',
      'grouped',
      'diverging',
      'balance',
      'table',
    ])
  })
})

describe('isBreakdownChartTabAvailable', () => {
  it('balance tylko przy obu kierunkach', () => {
    expect(isBreakdownChartTabAvailable('balance', ['EXPENSE', 'INCOME'])).toBe(true)
    expect(isBreakdownChartTabAvailable('balance', ['EXPENSE'])).toBe(false)
  })
})

describe('serializeBreakdownChartTab', () => {
  it('pomija domyślny tab w URL', () => {
    const single = serializeBreakdownChartTab('vertical', ['EXPENSE'], new URLSearchParams())
    expect(single.get('breakdownChart')).toBeNull()

    const both = serializeBreakdownChartTab('stacked', ['EXPENSE', 'INCOME'], new URLSearchParams())
    expect(both.get('breakdownChart')).toBeNull()
  })

  it('zapisuje nietypowy tab', () => {
    const params = serializeBreakdownChartTab('donut', ['EXPENSE'], new URLSearchParams())
    expect(params.get('breakdownChart')).toBe('donut')

    const both = serializeBreakdownChartTab(
      'diverging',
      ['EXPENSE', 'INCOME'],
      new URLSearchParams(),
    )
    expect(both.get('breakdownChart')).toBe('diverging')
  })
})
