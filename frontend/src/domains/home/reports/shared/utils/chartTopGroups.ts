import type { BreakdownGroup } from '@/domains/home/reports/shared/types/breakdown'

export const CHART_OTHERS_ID = 'others'
export const CHART_OTHERS_GROUP_ID = -1

export const CHART_TOP_MIN = 3
export const CHART_TOP_MAX = 15
export const CHART_TOP_DEFAULT = 5

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function breakdownGroupTurnover(group: BreakdownGroup): number {
  if (group.expenses != null || group.income != null) {
    return (group.expenses ?? 0) + (group.income ?? 0)
  }
  return group.amount
}

/** Wartość z URL do zapisu raportu (bez clampu do liczby grup). */
export function parseChartTopRaw(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  const value = Number.isFinite(parsed) ? parsed : CHART_TOP_DEFAULT
  return Math.min(CHART_TOP_MAX, Math.max(CHART_TOP_MIN, value))
}

export function parseChartTop(raw: string | null, groupCount = 0): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  const value = Number.isFinite(parsed) ? parsed : CHART_TOP_DEFAULT
  const maxAllowed = groupCount > 0 ? Math.min(CHART_TOP_MAX, groupCount) : CHART_TOP_MAX
  return Math.min(CHART_TOP_MAX, Math.max(CHART_TOP_MIN, Math.min(value, maxAllowed)))
}

export function breakdownGroupChartId(group: BreakdownGroup): string {
  if (group.id === CHART_OTHERS_GROUP_ID) return CHART_OTHERS_ID
  return group.id === null ? 'null' : String(group.id)
}

export interface LimitedChartGroups {
  displayGroups: BreakdownGroup[]
  othersSourceGroups: BreakdownGroup[]
}

export function limitGroupsForChart(groups: BreakdownGroup[], topN: number): LimitedChartGroups {
  if (groups.length === 0) {
    return { displayGroups: [], othersSourceGroups: [] }
  }

  const hasDirectionSplit = groups.some((group) => group.expenses != null || group.income != null)
  const sorted = [...groups].sort((a, b) => breakdownGroupTurnover(b) - breakdownGroupTurnover(a))

  if (sorted.length <= topN) {
    return { displayGroups: sorted, othersSourceGroups: [] }
  }

  const headCount = topN - 1
  const head = sorted.slice(0, headCount)
  const tail = sorted.slice(headCount)

  if (hasDirectionSplit) {
    const othersExpenses = roundMoney(tail.reduce((sum, group) => sum + (group.expenses ?? 0), 0))
    const othersIncome = roundMoney(tail.reduce((sum, group) => sum + (group.income ?? 0), 0))
    const othersAmount = roundMoney(othersExpenses + othersIncome)
    const expenseTotal = groups.reduce((sum, group) => sum + (group.expenses ?? 0), 0)
    const incomeTotal = groups.reduce((sum, group) => sum + (group.income ?? 0), 0)

    const othersGroup: BreakdownGroup = {
      id: CHART_OTHERS_GROUP_ID,
      name: 'Pozostałe',
      amount: othersAmount,
      expenses: othersExpenses,
      income: othersIncome,
      share: expenseTotal > 0 ? roundMoney((othersExpenses / expenseTotal) * 1000) / 10 : 0,
      shareIncome: incomeTotal > 0 ? roundMoney((othersIncome / incomeTotal) * 1000) / 10 : 0,
      itemCount: tail.reduce((sum, group) => sum + group.itemCount, 0),
    }

    return {
      displayGroups: [...head, othersGroup],
      othersSourceGroups: tail,
    }
  }

  const totalAmount = groups.reduce((sum, group) => sum + group.amount, 0)
  const othersAmount = roundMoney(tail.reduce((sum, group) => sum + group.amount, 0))
  const othersItemCount = tail.reduce((sum, group) => sum + group.itemCount, 0)
  const othersShare = totalAmount > 0 ? roundMoney((othersAmount / totalAmount) * 1000) / 10 : 0

  const othersGroup: BreakdownGroup = {
    id: CHART_OTHERS_GROUP_ID,
    name: 'Pozostałe',
    amount: othersAmount,
    share: othersShare,
    itemCount: othersItemCount,
  }

  return {
    displayGroups: [...head, othersGroup],
    othersSourceGroups: tail,
  }
}
