import api from './client'
import type { BreakdownReportData } from '@/domains/home/reports/shared/types/breakdown'

export interface BreakdownReportParams {
  dateFrom?: string
  dateTo?: string
  periodMode?: string
  groupBy?: string
  reportDirection?: string
  reportDirections?: string
  walletId?: number | string
  categoryId?: number | string
  concernId?: number | string
  paidFromPartyId?: number | string
  paidToPartyId?: number | string
  amountMin?: number | string
  amountMax?: number | string
  description?: string
}

export const fetchBreakdownReport = async (
  params: BreakdownReportParams,
): Promise<BreakdownReportData> =>
  (await api.get<BreakdownReportData>('/reports/breakdown', { params })).data
