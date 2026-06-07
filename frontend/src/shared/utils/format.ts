export function formatAmount(amount: number, forceSign = false): string {
  const abs = Math.abs(amount).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (forceSign) return (amount >= 0 ? '+' : '−') + abs + ' zł'
  return (amount < 0 ? '−' : '') + abs + ' zł'
}

export function formatDate(dateStr: string): string {
  return dateStr
}
