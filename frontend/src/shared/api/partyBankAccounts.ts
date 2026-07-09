import api from './client'
import type { PartyBankAccount, PartyBankAccountPayload } from '@/domains/home/configuration/general/parties/types'

export async function fetchPartyBankAccounts(partyId?: number): Promise<PartyBankAccount[]> {
  const params = partyId !== undefined ? `?partyId=${partyId}` : ''
  const res = await api.get<PartyBankAccount[]>(`/party-bank-accounts${params}`)
  return res.data
}

export async function createPartyBankAccount(payload: PartyBankAccountPayload): Promise<PartyBankAccount> {
  const res = await api.post<PartyBankAccount>('/party-bank-accounts', payload)
  return res.data
}

export async function updatePartyBankAccount(
  id: number,
  payload: Partial<Omit<PartyBankAccountPayload, 'partyId'>>,
): Promise<PartyBankAccount> {
  const res = await api.put<PartyBankAccount>(`/party-bank-accounts/${id}`, payload)
  return res.data
}

export async function deactivatePartyBankAccount(id: number): Promise<void> {
  await api.delete(`/party-bank-accounts/${id}`)
}
