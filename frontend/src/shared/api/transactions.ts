import api from './client'
import type { Transaction } from '@/shared/types'
import type { PaginationMeta } from '@/domains/home/transactions/types'

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  direction?: string
  status?: string
  paidFromPartyId?: number | string
  paidToPartyId?: number | string
  walletId?: number | string
  concernId?: number | string
  categoryId?: number | string
  amountMin?: string
  amountMax?: string
  description?: string
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
  transactionCount?: number
}

export interface CreateTransactionPayload {
  direction: string
  date: string
  amount: number
  description: string
  paidFromPartyId?: number | null
  paidToPartyId?: number | null
  items?: ItemPayload[]
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

export const createTransaction = async (payload: CreateTransactionPayload): Promise<Transaction> =>
  (await api.post<Transaction>('/transactions', payload)).data

export const fetchTransactionStats = async (params?: {
  dateFrom?: string
  dateTo?: string
  month?: string
}): Promise<TransactionStats> =>
  (await api.get<TransactionStats>('/transactions/stats', { params })).data

export const classifyTransactionItems = async (
  id: number,
  payload: ClassifyPayload,
): Promise<Transaction> =>
  (await api.put<Transaction>(`/transactions/${id}/items`, payload)).data

export interface TransactionSnapshotItem {
  amount: number
  description?: string | null
  walletId?: number | null
  wallet?: string | null
  concernId?: number | null
  concern?: string | null
  categoryId?: number | null
  category?: string | null
}

export interface TransactionSnapshot {
  paidFromPartyId?: number | null
  paidFrom?: string | null
  paidToPartyId?: number | null
  paidTo?: string | null
  items: TransactionSnapshotItem[]
}

export interface TransactionChangeLogEntry {
  id: number
  createdAt: string
  createdBy: string
  snapshot: TransactionSnapshot
}

export interface TransactionHistoryResponse {
  data: TransactionChangeLogEntry[]
  meta: PaginationMeta
}

export const fetchTransactionHistory = async (
  id: number,
  page = 1,
  perPage = 10,
): Promise<TransactionHistoryResponse> =>
  (await api.get<TransactionHistoryResponse>(`/transactions/${id}/history`, { params: { page, perPage } })).data

export const restoreTransactionHistory = async (
  transactionId: number,
  changeId: number,
): Promise<Transaction> =>
  (await api.post<Transaction>(`/transactions/${transactionId}/history/${changeId}/restore`)).data

export type BulkUpdateField =
  | 'paidFromPartyId'
  | 'paidToPartyId'
  | 'walletId'
  | 'concernId'
  | 'categoryId'

export interface BulkUpdatePayload {
  transactionIds: number[]
  fields: BulkUpdateField[]
  values: Partial<Record<BulkUpdateField, number | null>>
}

export interface BulkUpdateResponse {
  updated: number
}

export const bulkUpdateTransactions = async (payload: BulkUpdatePayload): Promise<BulkUpdateResponse> =>
  (await api.put<BulkUpdateResponse>('/transactions/bulk-update', payload)).data

export type { ApplyClassificationRulesResult } from './classificationRules'
export { applyClassificationRules } from './classificationRules'
