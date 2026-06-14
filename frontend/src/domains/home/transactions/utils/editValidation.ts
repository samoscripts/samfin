export const MIN_SPLIT_ITEMS = 1
export const MAX_SPLIT_ITEMS = 5

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function sumItemAmounts(items: { amount: number }[]): number {
  return roundMoney(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))
}

export function validateEditItems(
  items: { amount: number }[],
  transactionAmount: number,
): string | null {
  if (items.length < MIN_SPLIT_ITEMS) {
    return 'Wymagana co najmniej 1 pozycja.'
  }
  if (items.length > MAX_SPLIT_ITEMS) {
    return `Maksymalnie ${MAX_SPLIT_ITEMS} pozycji.`
  }

  for (let i = 0; i < items.length; i++) {
    const amount = roundMoney(Number(items[i].amount) || 0)
    if (amount <= 0) {
      return `Pozycja ${i + 1}: kwota musi być większa od zera.`
    }
  }

  const sum = sumItemAmounts(items)
  const expected = roundMoney(transactionAmount)
  if (sum !== expected) {
    return `Suma pozycji (${sum.toFixed(2)} zł) musi być równa kwocie transakcji (${expected.toFixed(2)} zł).`
  }

  return null
}

export function isSumMatching(items: { amount: number }[], transactionAmount: number): boolean {
  return sumItemAmounts(items) === roundMoney(transactionAmount)
}
