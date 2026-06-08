import api from './client'

export interface Concern {
  id: number
  name: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ConcernPayload = { name: string; description: string | null; active: boolean }

export const fetchConcerns    = async (): Promise<Concern[]> => (await api.get<Concern[]>('/concerns')).data
export const fetchConcern     = async (id: number): Promise<Concern> => (await api.get<Concern>(`/concerns/${id}`)).data
export const createConcern    = async (p: ConcernPayload): Promise<Concern> => (await api.post<Concern>('/concerns', p)).data
export const updateConcern    = async (id: number, p: Partial<ConcernPayload>): Promise<Concern> => (await api.put<Concern>(`/concerns/${id}`, p)).data
export const deactivateConcern = async (id: number): Promise<void> => { await api.delete(`/concerns/${id}`) }
