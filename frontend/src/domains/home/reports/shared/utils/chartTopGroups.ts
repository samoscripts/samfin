import type { BreakdownGroup } from '@/domains/home/reports/shared/types/breakdown'

export const CHART_OTHERS_ID = 'others'
export const CHART_OTHERS_GROUP_ID = -1

export const CHART_TOP_MIN = 3
export const CHART_TOP_MAX = 15
export const CHART_TOP_DEFAULT = 5

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

  const totalAmount = groups.reduce((sum, g) => sum + g.amount, 0)
  const sorted = [...groups].sort((a, b) => b.amount - a.amount)

  if (sorted.length <= topN) {
    return { displayGroups: sorted, othersSourceGroups: [] }
  }

  const headCount = topN - 1
  const head = sorted.slice(0, headCount)
  const tail = sorted.slice(headCount)
  const othersAmount = Math.round(tail.reduce((sum, g) => sum + g.amount, 0) * 100) / 100
  const othersItemCount = tail.reduce((sum, g) => sum + g.itemCount, 0)
  const othersShare =
    totalAmount > 0 ? Math.round((othersAmount / totalAmount) * 1000) / 10 : 0

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
