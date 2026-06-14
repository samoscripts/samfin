import api from './client'
import type { Party, PartyPayload } from '@/domains/home/configuration/parties/types'

export async function fetchParties(): Promise<Party[]> {
  const res = await api.get<Party[]>('/parties')
  return res.data
}

/** OWN parties with bank account and at least one import — context for classification rules. */
export async function fetchPartiesForClassificationRules(): Promise<Party[]> {
  const res = await api.get<Party[]>('/parties', { params: { ruleEligible: true } })
  return res.data
}

export async function fetchParty(id: number): Promise<Party> {
  const res = await api.get<Party>(`/parties/${id}`)
  return res.data
}

export async function createParty(payload: PartyPayload): Promise<Party> {
  const res = await api.post<Party>('/parties', payload)
  return res.data
}

export async function updateParty(id: number, payload: Partial<PartyPayload>): Promise<Party> {
  const res = await api.put<Party>(`/parties/${id}`, payload)
  return res.data
}

export async function deactivateParty(id: number): Promise<void> {
  await api.delete(`/parties/${id}`)
}
