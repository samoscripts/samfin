import type { Transaction } from '@/shared/types'
import type { Party } from '@/domains/home/configuration/parties/types'

export type PartyField = 'paidFrom' | 'paidTo'

/**
 * Returns true when the field is fixed by CSV import (own bank account side) and must not be edited.
 * EXPENSE imports lock Skąd; INCOME imports lock Dokąd.
 */
export function isOwnSideLocked(tx: Transaction, field: PartyField): boolean {
  if (tx.source !== 'CSV') {
    return false
  }
  if (field === 'paidFrom') {
    return tx.direction === 'EXPENSE'
  }
  return tx.direction === 'INCOME'
}

/**
 * Returns true when bulk update must not offer editing this field for the current selection.
 * Used when any selected transaction has that side locked by import rules.
 */
export function isPartyFieldBulkBlocked(transactions: Transaction[], field: PartyField): boolean {
  return transactions.some((tx) => isOwnSideLocked(tx, field))
}

/**
 * Returns true when the field is the manual-transaction own side (OWN + CASH only).
 */
function isManualOwnSideField(
  tx: Pick<Transaction, 'direction' | 'source'>,
  field: PartyField,
): boolean {
  if (tx.source !== 'MANUAL') {
    return false
  }
  if (field === 'paidFrom') {
    return tx.direction === 'EXPENSE'
  }
  return tx.direction === 'INCOME'
}

/** Returns true when the party represents the user's own cash (manual own-side rule). */
function isOwnCash(p: Party): boolean {
  return p.ownershipType === 'OWN' && p.type === 'CASH'
}

/**
 * Builds the dropdown list for Skąd or Dokąd on edit/create forms.
 * Applies import lock (empty list), manual OWN+CASH filter, active-only, and excludes the opposite selection.
 */
export function filterPartiesForField(
  parties: Party[],
  tx: Pick<Transaction, 'direction' | 'source'>,
  field: PartyField,
  otherPartyId: number | null,
): Party[] {
  if (isOwnSideLocked(tx as Transaction, field)) {
    return []
  }

  let list = parties.filter((p) => p.active)

  if (isManualOwnSideField(tx, field)) {
    list = list.filter(isOwnCash)
  }

  if (otherPartyId !== null) {
    list = list.filter((p) => p.id !== otherPartyId)
  }

  return list
}

/**
 * Returns active parties for Skąd/Dokąd filter dropdowns in the transaction list sidebar.
 */
export function filterPartiesForFilterPanel(parties: Party[]): { paidFrom: Party[]; paidTo: Party[] } {
  const active = parties.filter((p) => p.active)
  return { paidFrom: active, paidTo: active }
}

/** Resolves a party id to display name for read-only locked fields. */
export function resolvePartyName(parties: Party[], id: number | null | undefined): string {
  if (id == null) {
    return '— brak —'
  }
  return parties.find((p) => p.id === id)?.name ?? '— brak —'
}

/**
 * When Skąd or Dokąd changes, clears the opposite field if it pointed to the same party.
 */
export function applyPartyFieldChange(
  prev: { paidFromPartyId: number | null; paidToPartyId: number | null },
  field: PartyField,
  partyId: number | null,
): { paidFromPartyId: number | null; paidToPartyId: number | null } {
  if (field === 'paidFrom') {
    return {
      paidFromPartyId: partyId,
      paidToPartyId: prev.paidToPartyId === partyId ? null : prev.paidToPartyId,
    }
  }
  return {
    paidToPartyId: partyId,
    paidFromPartyId: prev.paidFromPartyId === partyId ? null : prev.paidFromPartyId,
  }
}
