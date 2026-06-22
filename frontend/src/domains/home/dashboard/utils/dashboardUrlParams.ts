import { buildSearchParams, parseOptionalString } from '@/shared/utils/urlQuery'
import { currentMonthParam, expandMonthSugar, parseMonthParam } from '@/shared/utils/monthQuery'

export interface DashboardUrlState {
  month: string
  dateFrom: string
  dateTo: string
}

export function parseDashboardSearchParams(params: URLSearchParams): DashboardUrlState {
  const month = parseMonthParam(params.get('month')) ?? currentMonthParam()
  const range = expandMonthSugar(month) ?? expandMonthSugar(currentMonthParam())!

  return {
    month,
    dateFrom: parseOptionalString(params.get('dateFrom')) ?? range.dateFrom,
    dateTo: parseOptionalString(params.get('dateTo')) ?? range.dateTo,
  }
}

export function serializeDashboardSearchParams(state: DashboardUrlState): URLSearchParams {
  const defaultMonth = currentMonthParam()
  return buildSearchParams({
    month: state.month !== defaultMonth ? state.month : undefined,
  })
}
