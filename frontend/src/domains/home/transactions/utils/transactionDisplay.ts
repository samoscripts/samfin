import type { Transaction } from '@/shared/types'



export function transactionPrimaryLabel(tx: Transaction): string | null {

  const title = tx.transTitle?.trim()

  if (title) return title



  return tx.transDescription?.trim() || null

}



/** Podtytuły pod główną linią (tytuł). */
export function transactionSubtitleLines(tx: Transaction): string[] {
  const title = tx.transTitle?.trim()
  if (!title) return []

  const desc = tx.transDescription?.trim()
  if (!desc) return []

  return [desc]
}



export function transactionDisplayLabel(tx: Transaction): string {

  return transactionPrimaryLabel(tx) ?? '—'

}


