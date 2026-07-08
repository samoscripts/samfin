import type { FlowFilters } from '@/domains/home/transactions/types'
import type {
  BreakdownGroup,
  BreakdownGroupBy,
  BreakdownDirection,
} from '@/domains/home/reports/shared/types/breakdown'
import { CHART_OTHERS_GROUP_ID } from '@/domains/home/reports/shared/utils/chartTopGroups'

export interface BreakdownDrillDownFiltersInput {
  group: BreakdownGroup
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  dateFrom: string
  dateTo: string
  reportFilters?: FlowFilters
}

export function breakdownGroupToFlowFilters({
  group,
  groupBy,
  direction,
  dateFrom,
  dateTo,
  reportFilters = {},
}: BreakdownDrillDownFiltersInput): FlowFilters {
  const filters: FlowFilters = {
    ...reportFilters,
    dateFrom,
    dateTo,
    directions: [direction],
  }

  const isOthers = group.id === CHART_OTHERS_GROUP_ID
  if (!isOthers && group.id !== null && group.id > 0) {
    if (groupBy === 'categoryMain' || groupBy === 'categorySub') {
      filters.categoryId = String(group.id)
    } else if (groupBy === 'wallet') {
      filters.walletId = String(group.id)
    } else if (groupBy === 'concern') {
      filters.concernId = String(group.id)
    }
  }

  return filters
}

export function breakdownDrillDownLimitNote(group: BreakdownGroup): string | undefined {
  if (group.id === CHART_OTHERS_GROUP_ID) {
    return 'Grupa „Pozostałe” nie ma dedykowanego filtra — lista obejmuje okres, kierunek i filtry raportu.'
  }
  if (group.id === null) {
    return 'Pozycje bez wartości w tej grupie nie mają dedykowanego filtra — lista obejmuje okres, kierunek i filtry raportu.'
  }
  return undefined
}
