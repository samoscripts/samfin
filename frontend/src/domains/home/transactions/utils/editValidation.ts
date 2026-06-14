import type { Direction } from '@/shared/types'
import {
  MAX_SPLIT_ITEMS,
  MIN_SPLIT_ITEMS,
  roundMoney,
  sumItemAmounts,
  toMinor,
} from '@/shared/utils/splitAllocation'

export { MAX_SPLIT_ITEMS, MIN_SPLIT_ITEMS, roundMoney, sumItemAmounts }

export function validateEditItems(
  items: { amount: number }[],
  transactionAmount: number,
  direction: Direction,
): string | null {
  if (items.length < MIN_SPLIT_ITEMS) {
    return 'Wymagana co najmniej 1 pozycja.'
  }
  if (items.length > MAX_SPLIT_ITEMS) {
    return `Maksymalnie ${MAX_SPLIT_ITEMS} pozycje.`
  }

  for (let i = 0; i < items.length; i++) {
    const amount = roundMoney(Number(items[i].amount) || 0)
    if (amount === 0) {
      return `Pozycja ${i + 1}: kwota nie może być równa zero.`
    }
    if (direction === 'INCOME' && amount <= 0) {
      return `Pozycja ${i + 1}: dla wpływu kwota musi być większa od zera.`
    }
    if (direction === 'EXPENSE' && amount >= 0) {
      return `Pozycja ${i + 1}: dla wydatku kwota musi być mniejsza od zera.`
    }
  }

  const sumMinor = toMinor(sumItemAmounts(items))
  const expectedMinor = toMinor(transactionAmount)
  if (sumMinor !== expectedMinor) {
    return `Suma pozycji (${roundMoney(sumItemAmounts(items)).toFixed(2)} zł) musi być równa kwocie transakcji (${roundMoney(transactionAmount).toFixed(2)} zł).`
  }

  return null
}

export function isSumMatching(
  items: { amount: number }[],
  transactionAmount: number,
): boolean {
  return toMinor(sumItemAmounts(items)) === toMinor(transactionAmount)
}
