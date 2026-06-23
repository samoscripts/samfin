import type { ClassificationItemDraft } from '@/shared/components/classification/ClassificationItemsEditor'
import type { TransactionTemplate, TransactionTemplatePayload } from '@/shared/api/transactionTemplates'
import type { BulkUpdateField } from '@/shared/api/transactions'
import type { Direction, Transaction } from '@/shared/types'
import { isOwnSideLocked, isPartyFieldBulkBlocked } from './partyAssignment'

export type BulkFieldState = { enabled: boolean; value: number | null }
export type BulkClassificationDraft = Record<BulkUpdateField, BulkFieldState>

export interface ClassificationDraftFields {
  paidFromPartyId: number | null
  paidToPartyId: number | null
  items: ClassificationItemDraft[]
}

function firstItemFields(items: ClassificationItemDraft[]): {
  walletId: number | null
  concernId: number | null
  categoryId: number | null
} {
  const item = items[0]
  return {
    walletId: item?.walletId ?? null,
    concernId: item?.concernId ?? null,
    categoryId: item?.categoryId ?? null,
  }
}

export function templatePayloadFromDraft(
  direction: Direction,
  draft: ClassificationDraftFields,
): Omit<TransactionTemplatePayload, 'name'> {
  const { walletId, concernId, categoryId } = firstItemFields(draft.items)
  return {
    direction,
    paidFromPartyId: draft.paidFromPartyId,
    paidToPartyId: draft.paidToPartyId,
    walletId,
    concernId,
    categoryId,
  }
}

function applyClassificationToItems(
  items: ClassificationItemDraft[],
  template: TransactionTemplate,
): ClassificationItemDraft[] {
  return items.map((item) => ({
    ...item,
    ...(template.walletId != null ? { walletId: template.walletId } : {}),
    ...(template.concernId != null ? { concernId: template.concernId } : {}),
    ...(template.categoryId != null ? { categoryId: template.categoryId } : {}),
  }))
}

export function bulkTemplatePayloadFromDraft(
  direction: Direction,
  draft: BulkClassificationDraft,
): Omit<TransactionTemplatePayload, 'name'> {
  return {
    direction,
    paidFromPartyId: draft.paidFromPartyId.enabled ? draft.paidFromPartyId.value : null,
    paidToPartyId: draft.paidToPartyId.enabled ? draft.paidToPartyId.value : null,
    walletId: draft.walletId.enabled ? draft.walletId.value : null,
    concernId: draft.concernId.enabled ? draft.concernId.value : null,
    categoryId: draft.categoryId.enabled ? draft.categoryId.value : null,
  }
}

export function applyTemplateToBulkDraft(
  draft: BulkClassificationDraft,
  template: TransactionTemplate,
  transactions: Transaction[],
): BulkClassificationDraft {
  const paidFromBlocked = isPartyFieldBulkBlocked(transactions, 'paidFrom')
  const paidToBlocked = isPartyFieldBulkBlocked(transactions, 'paidTo')

  const next: BulkClassificationDraft = {
    paidFromPartyId: { ...draft.paidFromPartyId },
    paidToPartyId: { ...draft.paidToPartyId },
    walletId: { ...draft.walletId },
    concernId: { ...draft.concernId },
    categoryId: { ...draft.categoryId },
  }

  if (!paidFromBlocked && template.paidFromPartyId != null) {
    next.paidFromPartyId = { enabled: true, value: template.paidFromPartyId }
    if (
      next.paidToPartyId.enabled &&
      next.paidToPartyId.value === template.paidFromPartyId
    ) {
      next.paidToPartyId = { ...next.paidToPartyId, value: null }
    }
  }

  if (!paidToBlocked && template.paidToPartyId != null) {
    next.paidToPartyId = { enabled: true, value: template.paidToPartyId }
    if (
      next.paidFromPartyId.enabled &&
      next.paidFromPartyId.value === template.paidToPartyId
    ) {
      next.paidFromPartyId = { ...next.paidFromPartyId, value: null }
    }
  }

  if (template.walletId != null) {
    next.walletId = { enabled: true, value: template.walletId }
  }
  if (template.concernId != null) {
    next.concernId = { enabled: true, value: template.concernId }
  }
  if (template.categoryId != null) {
    next.categoryId = { enabled: true, value: template.categoryId }
  }

  return next
}

export function applyTemplateToDraft<T extends ClassificationDraftFields>(
  draft: T,
  template: TransactionTemplate,
  tx?: Pick<Transaction, 'direction' | 'source'>,
): T {
  const paidFromLocked = tx ? isOwnSideLocked(tx as Transaction, 'paidFrom') : false
  const paidToLocked = tx ? isOwnSideLocked(tx as Transaction, 'paidTo') : false

  return {
    ...draft,
    paidFromPartyId:
      paidFromLocked || template.paidFromPartyId == null
        ? draft.paidFromPartyId
        : template.paidFromPartyId,
    paidToPartyId:
      paidToLocked || template.paidToPartyId == null ? draft.paidToPartyId : template.paidToPartyId,
    items: applyClassificationToItems(draft.items, template),
  }
}
