import api from './client'

export interface TransactionFilterSaved {
  id: number
  name: string
  description: string | null
  params: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TransactionFilterSavedPayload {
  name: string
  description?: string | null
  params: Record<string, unknown>
}

export const fetchTransactionFilterSavedList = async (): Promise<TransactionFilterSaved[]> =>
  (await api.get<TransactionFilterSaved[]>('/transaction-filter-saved')).data

export const createTransactionFilterSaved = async (
  payload: TransactionFilterSavedPayload,
): Promise<TransactionFilterSaved> =>
  (await api.post<TransactionFilterSaved>('/transaction-filter-saved', payload)).data

export const updateTransactionFilterSaved = async (
  id: number,
  payload: Partial<Pick<TransactionFilterSavedPayload, 'name' | 'description' | 'params'>>,
): Promise<TransactionFilterSaved> =>
  (await api.put<TransactionFilterSaved>(`/transaction-filter-saved/${id}`, payload)).data

export const deleteTransactionFilterSaved = async (id: number): Promise<void> => {
  await api.delete(`/transaction-filter-saved/${id}`)
}
