import api from './client'
import type { Direction } from '@/shared/types'

export interface TransactionTemplate {
  id: number
  name: string
  direction: Direction
  paidFromPartyId: number | null
  paidToPartyId: number | null
  walletId: number | null
  concernId: number | null
  categoryId: number | null
  transCustomDescription?: string | null
  createdAt: string
  updatedAt: string
}

export type TransactionTemplatePayload = {
  name: string
  direction: Direction
  paidFromPartyId: number | null
  paidToPartyId: number | null
  walletId: number | null
  concernId: number | null
  categoryId: number | null
  transCustomDescription?: string | null
}

export const fetchTransactionTemplates = async (direction: Direction): Promise<TransactionTemplate[]> =>
  (await api.get<TransactionTemplate[]>('/transaction-templates', { params: { direction } })).data

export const createTransactionTemplate = async (
  payload: TransactionTemplatePayload,
): Promise<TransactionTemplate> =>
  (await api.post<TransactionTemplate>('/transaction-templates', payload)).data

export const deleteTransactionTemplate = async (id: number): Promise<void> => {
  await api.delete(`/transaction-templates/${id}`)
}
