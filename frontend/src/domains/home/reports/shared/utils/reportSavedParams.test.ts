import { describe, expect, it } from 'vitest'

import type { ParsedReportPeriodState } from '@/domains/home/reports/shared/utils/reportPeriod'
import type { ReportPeriodDefaults } from '@/shared/utils/periodUrl'

import {
  applyBreakdownParams,
  captureBreakdownParams,
  normalizeBreakdownParams,
} from './reportSavedParams'

const periodSnapshot = {
  mode: 'range' as const,
  year: 2025,
  month: 1,
  quarter: 1,
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
}

const periodDefaults: ReportPeriodDefaults = { year: 2025, month: 1 }

const parsedPeriod: ParsedReportPeriodState = {
  mode: 'range',
  year: 2025,
  month: 1,
  quarter: 1,
  monthParam: '2025-01',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  isCustomRange: true,
}

describe('normalizeBreakdownParams — migracja reportDirection → reportDirections', () => {
  it('mapuje stary klucz reportDirection=EXPENSE', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'categoryMain',
      reportDirection: 'EXPENSE',
      chartTop: 5,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['EXPENSE'])
  })

  it('mapuje stary klucz reportDirection=INCOME', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'wallet',
      reportDirection: 'INCOME',
      chartTop: 8,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['INCOME'])
  })

  it('zachowuje nowy klucz reportDirections', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'categoryMain',
      reportDirections: ['EXPENSE', 'INCOME'],
      chartTop: 10,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['EXPENSE', 'INCOME'])
  })

  it('reportDirections ma pierwszeństwo nad reportDirection', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'categoryMain',
      reportDirections: ['INCOME'],
      reportDirection: 'EXPENSE',
      chartTop: 5,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['INCOME'])
  })

  it('domyślnie EXPENSE gdy brak kierunku', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'categoryMain',
      chartTop: 5,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['EXPENSE'])
  })

  it('odrzuca nieznane wartości w reportDirections', () => {
    const result = normalizeBreakdownParams({
      period: periodSnapshot,
      groupBy: 'categoryMain',
      reportDirections: ['FOO', 'INCOME'] as unknown as ['INCOME'],
      chartTop: 5,
      filters: {},
    })

    expect(result.reportDirections).toEqual(['INCOME'])
  })
})

describe('applyBreakdownParams — URL po wczytaniu zapisanego raportu', () => {
  it('stary zapis INCOME serializuje reportDirections w URL', () => {
    const url = applyBreakdownParams(
      {
        period: periodSnapshot,
        reportDirection: 'INCOME',
        groupBy: 'wallet',
        chartTop: 8,
        filters: {},
      },
      periodDefaults,
    )

    expect(url.get('reportDirections')).toBe('INCOME')
    expect(url.has('reportDirection')).toBe(false)
    expect(url.get('groupBy')).toBe('wallet')
    expect(url.get('chartTop')).toBe('8')
    expect(url.get('dateFrom')).toBe('2025-01-01')
    expect(url.get('dateTo')).toBe('2025-01-31')
  })

  it('domyślny EXPENSE nie dodaje reportDirections do URL', () => {
    const url = applyBreakdownParams(
      {
        period: periodSnapshot,
        reportDirection: 'EXPENSE',
        groupBy: 'categoryMain',
        chartTop: 5,
        filters: {},
      },
      periodDefaults,
    )

    expect(url.get('reportDirections')).toBeNull()
    expect(url.has('reportDirection')).toBe(false)
  })

  it('oba kierunki → reportDirections=EXPENSE,INCOME', () => {
    const url = applyBreakdownParams(
      {
        period: periodSnapshot,
        reportDirections: ['EXPENSE', 'INCOME'],
        groupBy: 'categoryMain',
        chartTop: 5,
        filters: {},
      },
      periodDefaults,
    )

    expect(url.get('reportDirections')).toBe('EXPENSE,INCOME')
    expect(url.has('reportDirection')).toBe(false)
  })

  it('zapisuje reportSavedId gdy podany', () => {
    const url = applyBreakdownParams(
      {
        period: periodSnapshot,
        reportDirections: ['INCOME'],
        groupBy: 'concern',
        chartTop: 3,
        filters: {},
      },
      periodDefaults,
      42,
    )

    expect(url.get('reportSavedId')).toBe('42')
  })
})

describe('captureBreakdownParams — round-trip zapisu', () => {
  it('zapisuje reportDirections (nowy format), nie reportDirection', () => {
    const captured = captureBreakdownParams(
      parsedPeriod,
      'categorySub',
      ['EXPENSE', 'INCOME'],
      12,
      { categoryId: '3' },
      'grouped',
    )

    expect(captured.reportDirections).toEqual(['EXPENSE', 'INCOME'])
    expect(captured).not.toHaveProperty('reportDirection')
    expect(captured.groupBy).toBe('categorySub')
    expect(captured.chartTop).toBe(12)
    expect(captured.breakdownChart).toBe('grouped')
    expect(captured.filters.categoryId).toBe('3')
  })

  it('wczytanie starego JSON i ponowny zapis daje reportDirections w URL', () => {
    const legacy = {
      period: periodSnapshot,
      groupBy: 'categoryMain' as const,
      reportDirection: 'INCOME' as const,
      chartTop: 6,
      filters: {},
    }

    const normalized = normalizeBreakdownParams(legacy)
    expect(normalized.reportDirections).toEqual(['INCOME'])

    const url = applyBreakdownParams(normalized, periodDefaults)
    expect(url.get('reportDirections')).toBe('INCOME')
    expect(url.get('breakdownChart')).toBeNull()
  })

  it('round-trip breakdownChart w URL', () => {
    const captured = captureBreakdownParams(
      parsedPeriod,
      'wallet',
      ['EXPENSE', 'INCOME'],
      5,
      {},
      'diverging',
    )
    const url = applyBreakdownParams(captured, periodDefaults)
    expect(url.get('breakdownChart')).toBe('diverging')
    expect(url.get('reportDirections')).toBe('EXPENSE,INCOME')
  })
})
