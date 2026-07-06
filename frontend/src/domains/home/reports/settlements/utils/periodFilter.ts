import type { SettlementItemRef, WalletGroupBucket, WalletSettlementGroup } from '@/shared/api/settlements'
import { expandMonthSugar } from '@/shared/utils/monthQuery'

export type SettlementPeriodMode = 'full' | 'month' | 'range'

export interface SettlementPeriodFilter {
  mode: SettlementPeriodMode
  monthParam: string
  dateFrom: string
  dateTo: string
}

export function clampDateRange(
  dateFrom: string,
  dateTo: string,
  indexFrom: string,
  indexTo: string,
): { dateFrom: string; dateTo: string } {
  let from = dateFrom < indexFrom ? indexFrom : dateFrom
  let to = dateTo > indexTo ? indexTo : dateTo
  if (from > to) {
    to = from
  }
  return { dateFrom: from, dateTo: to }
}

export function resolvePeriodBounds(
  filter: SettlementPeriodFilter,
  indexFrom: string,
  indexTo: string,
): { dateFrom: string; dateTo: string } {
  if (filter.mode === 'full') {
    return { dateFrom: indexFrom, dateTo: indexTo }
  }

  if (filter.mode === 'month') {
    const range = expandMonthSugar(filter.monthParam)
    if (!range) {
      return { dateFrom: indexFrom, dateTo: indexTo }
    }
    return clampDateRange(range.dateFrom, range.dateTo, indexFrom, indexTo)
  }

  return clampDateRange(filter.dateFrom, filter.dateTo, indexFrom, indexTo)
}

export function filterItemsByDate(
  items: SettlementItemRef[],
  dateFrom: string,
  dateTo: string,
): SettlementItemRef[] {
  return items.filter((item) => item.date >= dateFrom && item.date <= dateTo)
}

export function sumItemAmounts(items: SettlementItemRef[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
}

export function filterBucket(
  bucket: WalletGroupBucket,
  dateFrom: string,
  dateTo: string,
): WalletGroupBucket {
  const items = filterItemsByDate(bucket.items, dateFrom, dateTo)
  return { items, total: sumItemAmounts(items) }
}

export function filterWalletGroup(
  group: WalletSettlementGroup,
  dateFrom: string,
  dateTo: string,
): WalletSettlementGroup {
  const expenses = filterBucket(group.expenses, dateFrom, dateTo)
  const incomes = filterBucket(group.incomes, dateFrom, dateTo)
  return {
    expenses,
    incomes,
    net: Math.round((expenses.total - incomes.total) * 100) / 100,
  }
}

export function isFullIndexPeriod(
  filter: SettlementPeriodFilter,
  indexFrom: string,
  indexTo: string,
): boolean {
  if (filter.mode === 'full') return true
  const bounds = resolvePeriodBounds(filter, indexFrom, indexTo)
  return bounds.dateFrom === indexFrom && bounds.dateTo === indexTo
}
