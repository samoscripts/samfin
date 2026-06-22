import type { ClassificationItemDraft } from '@/shared/components/classification/ClassificationItemsEditor'
import type { TransactionTemplate, TransactionTemplatePayload } from '@/shared/api/transactionTemplates'
import type { Direction, Transaction } from '@/shared/types'
import { isOwnSideLocked } from './partyAssignment'

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
