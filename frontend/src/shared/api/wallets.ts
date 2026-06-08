import api from './client'

export interface Wallet {
  id: number
  name: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type WalletPayload = { name: string; description: string | null; active: boolean }

export const fetchWallets = async (): Promise<Wallet[]> => (await api.get<Wallet[]>('/wallets')).data
export const fetchWallet  = async (id: number): Promise<Wallet> => (await api.get<Wallet>(`/wallets/${id}`)).data
export const createWallet = async (p: WalletPayload): Promise<Wallet> => (await api.post<Wallet>('/wallets', p)).data
export const updateWallet = async (id: number, p: Partial<WalletPayload>): Promise<Wallet> => (await api.put<Wallet>(`/wallets/${id}`, p)).data
export const deactivateWallet = async (id: number): Promise<void> => { await api.delete(`/wallets/${id}`) }
