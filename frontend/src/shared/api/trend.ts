import api from './client'
import type { TrendReportData } from '@/domains/home/reports/trend/types/trend'

export interface TrendReportParams {
  dateFrom: string
  dateTo: string
  trendSeriesBy?: string
  trendGranularity?: string
  trendTerms?: string
  trendCategoryIds?: string
  trendWalletIds?: string
  trendConcernIds?: string
  trendDirections?: string
  description?: string
  categoryId?: number | string
  walletId?: number | string
  concernId?: number | string
  amountMin?: number | string
  amountMax?: number | string
  paidFromPartyId?: number | string
  paidToPartyId?: number | string
}

export const fetchTrendReport = async (
  params: TrendReportParams,
): Promise<TrendReportData> =>
  (await api.get<TrendReportData>('/reports/trend', { params })).data
