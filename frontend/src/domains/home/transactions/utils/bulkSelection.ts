import type { Transaction } from '@/shared/types'

export function getSelectedTransactions(data: Transaction[], selectedIds: Set<number>): Transaction[] {
  return data.filter((tx) => selectedIds.has(tx.transactionId))
}

export function hasMixedDirections(transactions: Transaction[]): boolean {
  const directions = new Set(transactions.map((t) => t.direction))
  return directions.size > 1
}

export function toggleIdInSet(set: Set<number>, id: number): Set<number> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function seedSelectionFromCurrent(
  set: Set<number>,
  currentId: number | null | undefined,
): Set<number> {
  if (set.size > 0 || currentId == null) return set
  return new Set([currentId])
}

export function toggleBulkSelection(
  set: Set<number>,
  id: number,
  currentId?: number | null,
): Set<number> {
  return toggleIdInSet(seedSelectionFromCurrent(set, currentId), id)
}

export function selectRange(data: Transaction[], from: number, to: number): Set<number> {
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  return new Set(data.slice(start, end + 1).map((t) => t.transactionId))
}

export function clampIndex(index: number, length: number): number {
  if (length === 0) return -1
  return Math.max(0, Math.min(length - 1, index))
}
