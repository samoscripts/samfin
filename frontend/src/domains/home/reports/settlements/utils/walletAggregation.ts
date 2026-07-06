import type { SettlementItemRef } from '@/shared/api/settlements'

export interface WalletAggregateRow {
  wallet: string
  expenses: number
  incomes: number
  net: number
}

export function aggregateItemsByWallet(
  expenseItems: SettlementItemRef[],
  incomeItems: SettlementItemRef[],
): WalletAggregateRow[] {
  const map = new Map<string, { expenses: number; incomes: number }>()

  for (const item of expenseItems) {
    const key = item.wallet ?? '—'
    const row = map.get(key) ?? { expenses: 0, incomes: 0 }
    row.expenses += item.amount
    map.set(key, row)
  }

  for (const item of incomeItems) {
    const key = item.wallet ?? '—'
    const row = map.get(key) ?? { expenses: 0, incomes: 0 }
    row.incomes += item.amount
    map.set(key, row)
  }

  return [...map.entries()]
    .map(([wallet, { expenses, incomes }]) => ({
      wallet,
      expenses: Math.round(expenses * 100) / 100,
      incomes: Math.round(incomes * 100) / 100,
      net: Math.round((expenses - incomes) * 100) / 100,
    }))
    .sort((a, b) => a.wallet.localeCompare(b.wallet, 'pl'))
}
