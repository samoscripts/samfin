import { describe, expect, it } from 'vitest'
import {
  applyTransactionFilterParams,
  captureTransactionFilterParams,
  FILTER_SAVED_ID_PARAM,
} from './transactionFilterSavedParams'

describe('transactionFilterSavedParams', () => {
  it('captureTransactionFilterParams normalizuje puste wartości', () => {
    const captured = captureTransactionFilterParams(
      {
        dateFrom: '2025-01-01',
        dateTo: '',
        directions: ['EXPENSE'],
        description: undefined,
      },
      { field: 'date', direction: 'desc' },
      50,
    )

    expect(captured).toEqual({
      filters: {
        dateFrom: '2025-01-01',
        directions: ['EXPENSE'],
      },
      sort: { field: 'date', direction: 'desc' },
      perPage: 50,
    })
  })

  it('applyTransactionFilterParams odtwarza snapshot', () => {
    const applied = applyTransactionFilterParams({
      filters: {
        directions: ['INCOME'],
        walletId: '3',
      },
      sort: { field: 'amount', direction: 'asc' },
      perPage: 10,
    })

    expect(applied.filters).toEqual({
      directions: ['INCOME'],
      walletId: '3',
    })
    expect(applied.sort).toEqual({ field: 'amount', direction: 'asc' })
    expect(applied.perPage).toBe(10)
  })

  it('eksportuje stałą parametru URL', () => {
    expect(FILTER_SAVED_ID_PARAM).toBe('filterSavedId')
  })
})
