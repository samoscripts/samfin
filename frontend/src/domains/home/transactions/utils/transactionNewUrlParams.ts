import type { Direction } from '@/shared/types'
import { buildSearchParams, parseOptionalString, parsePositiveInt } from '@/shared/utils/urlQuery'

export interface TransactionNewUrlPrefill {
  direction?: Direction
  date?: string
  amount?: string
  description?: string
  paidFromPartyId?: string
  paidToPartyId?: string
  walletId?: string
  concernId?: string
  categoryId?: string
}

const VALID_DIRECTIONS = new Set<Direction>(['EXPENSE', 'INCOME'])

export function parseTransactionNewSearchParams(params: URLSearchParams): TransactionNewUrlPrefill {
  const directionRaw = parseOptionalString(params.get('direction'))?.toUpperCase()
  const direction =
    directionRaw && VALID_DIRECTIONS.has(directionRaw as Direction)
      ? (directionRaw as Direction)
      : undefined

  return {
    direction,
    date: parseOptionalString(params.get('date')),
    amount: parseOptionalString(params.get('amount')),
    description: parseOptionalString(params.get('description')),
    paidFromPartyId: parseOptionalString(params.get('paidFromPartyId')),
    paidToPartyId: parseOptionalString(params.get('paidToPartyId')),
    walletId: parseOptionalString(params.get('walletId')),
    concernId: parseOptionalString(params.get('concernId')),
    categoryId: parseOptionalString(params.get('categoryId')),
  }
}

export function serializeTransactionNewSearchParams(prefill: TransactionNewUrlPrefill): URLSearchParams {
  return buildSearchParams({
    direction: prefill.direction,
    date: prefill.date,
    amount: prefill.amount,
    description: prefill.description,
    paidFromPartyId: prefill.paidFromPartyId,
    paidToPartyId: prefill.paidToPartyId,
    walletId: prefill.walletId,
    concernId: prefill.concernId,
    categoryId: prefill.categoryId,
  })
}

export function defaultNewTransactionDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseAmountFromUrl(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const n = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseIdFromUrl(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const n = parsePositiveInt(value) ?? Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
