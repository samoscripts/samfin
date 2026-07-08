import api from './client'
import type { TransactionStats } from './transactions'

export interface AnalyticsReportResponse extends TransactionStats {
  year: number
  month: number
  dateFrom: string | null
  dateTo: string | null
  transactionCount: number
}

export interface AnalyticsReportParams {
  year?: number
  month?: number
  dateFrom?: string
  dateTo?: string
  periodMode?: string
  walletId?: number | string
  concernId?: number | string
  categoryId?: number | string
}

export const fetchAnalyticsReport = async (
  params: AnalyticsReportParams,
): Promise<AnalyticsReportResponse> =>
  (await api.get<AnalyticsReportResponse>('/reports/analytics', { params })).data
