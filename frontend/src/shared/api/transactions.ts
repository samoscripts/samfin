import api from './client'
import type { Transaction } from '@/shared/types'
import type { PaginationMeta } from '@/domains/home/transactions/types'

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  direction?: 'EXPENSE' | 'INCOME' | ''
  status?: string
  paidFromPartyId?: number | string
  paidToPartyId?: number | string
  walletId?: number | string
  concernId?: number | string
  categoryId?: number | string
  amountMin?: string
  amountMax?: string
}

export interface TransactionListResponse {
  data: Transaction[]
  meta: PaginationMeta
}

export interface TransactionStats {
  income: number
  expenses: number
  balance: number
  unclassifiedCount: number
}

export interface ItemPayload {
  amount: number
  walletId?: number | null
  concernId?: number | null
  categoryId?: number | null
  description?: string | null
}

export interface ClassifyPayload {
  items: ItemPayload[]
  paidFromPartyId?: number | null
  paidToPartyId?: number | null
}

export const fetchTransactions = async (
  filters: TransactionFilters,
  sortField: string,
  sortDir: string,
  page: number,
  perPage: number,
): Promise<TransactionListResponse> => {
  const params = { ...filters, sortField, sortDir, page, perPage }
  return (await api.get<TransactionListResponse>('/transactions', { params })).data
}

export const fetchTransaction = async (id: number): Promise<Transaction> =>
  (await api.get<Transaction>(`/transactions/${id}`)).data

export const fetchTransactionStats = async (params?: {
  dateFrom?: string
  dateTo?: string
}): Promise<TransactionStats> =>
  (await api.get<TransactionStats>('/transactions/stats', { params })).data

export const classifyTransactionItems = async (
  id: number,
  payload: ClassifyPayload,
): Promise<Transaction> =>
  (await api.put<Transaction>(`/transactions/${id}/items`, payload)).data
