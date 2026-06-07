export type Direction = 'EXPENSE' | 'INCOME'
export type Status = 'UNCLASSIFIED' | 'PARTIALLY_CLASSIFIED' | 'CLASSIFIED'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface FlowItem {
  id: number
  amount: number
  wallet?: string
  concern?: string
  category?: string
}

export interface Transaction {
  transactionId: number
  date: string
  description: string
  amount: number
  paidFrom: string
  paidTo: string
  direction: Direction
  status: Status
  unassigned?: boolean
  items: FlowItem[]
}
