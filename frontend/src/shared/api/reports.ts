import api from './client'
import type { TransactionStats } from './transactions'

export interface MonthlyReportResponse extends TransactionStats {
  year: number
  month: number
  dateFrom: string
  dateTo: string
  transactionCount: number
}

export interface MonthlyReportParams {
  year?: number
  month?: number
  walletId?: number | string
  concernId?: number | string
  categoryId?: number | string
}

export const fetchMonthlyReport = async (
  params: MonthlyReportParams,
): Promise<MonthlyReportResponse> =>
  (await api.get<MonthlyReportResponse>('/reports/monthly', { params })).data
