export type Direction = 'EXPENSE' | 'INCOME'
export type Status = 'UNCLASSIFIED' | 'PARTIALLY_CLASSIFIED' | 'CLASSIFIED'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface FlowItem {
  id: number
  amount: number
  description?: string | null
  walletId?: number | null
  wallet?: string | null
  concernId?: number | null
  concern?: string | null
  categoryId?: number | null
  category?: string | null
}

export interface Transaction {
  transactionId: number
  date: string
  description: string | null
  amount: number
  paidFromPartyId?: number | null
  paidFrom?: string | null
  paidToPartyId?: number | null
  paidTo?: string | null
  direction: Direction
  status: Status
  source?: string
  items: FlowItem[]
}
