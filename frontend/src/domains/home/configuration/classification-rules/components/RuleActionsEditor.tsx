import type { RuleActionsPayload } from '@/shared/api/classificationRules'

import type { Party } from '@/domains/home/configuration/parties/types'

import type { Category } from '@/shared/api/categories'

import ClassificationItemsEditor, {
  type ClassificationItemDraft,
} from '@/shared/components/classification/ClassificationItemsEditor'

import PartySelect from '@/shared/components/form/PartySelect'

import { FieldRow, ReadOnlyField } from '@/shared/components/form/FormSection'

import { configSelectCls } from '@/shared/components/form/formClasses'

import { draftToRuleItems, ruleItemsToDraft, type RuleDirection } from '../constants'

const NO_CHANGE_LABEL = '— bez zmiany —'

const EMPTY_DICT_LABEL = '—'

const OWN_SIDE_HINT = 'Wynika z podmiotu i kierunku reguły'

export interface RuleActionsEditorProps {
  actions: RuleActionsPayload
  direction: RuleDirection
  contextPartyId: number | null
  ruleContextParties: Party[]
  parties: Party[]
  wallets: { id: number; name: string }[]
  concerns: { id: number; name: string }[]
  categories: Category[]
  onChange: (actions: RuleActionsPayload) => void
  actionsLocked?: boolean
  onPartyCreated?: (party: Party) => void
  onCategoryCreated?: (category: Category) => void
}

function partyName(parties: Party[], id: number | null | undefined): string {
  if (id == null) return '—'
  return parties.find((p) => p.id === id)?.name ?? '—'
}

export default function RuleActionsEditor({
  actions,
  direction,
  contextPartyId,
  ruleContextParties,
  parties,
  wallets,
  concerns,
  categories,
  onChange,
  actionsLocked = false,
  onPartyCreated,
  onCategoryCreated,
}: RuleActionsEditorProps) {
  const ownSideName =
    contextPartyId !== null
      ? (ruleContextParties.find((p) => p.id === contextPartyId)?.name ?? '—')
      : '—'

  const itemDraft = ruleItemsToDraft(actions.items)

  const categoryDirection =
    direction === 'EXPENSE' || direction === 'INCOME' ? direction : undefined

  function setTransactionParty(
    field: 'paidFromPartyId' | 'paidToPartyId',
    value: string | number | null,
  ) {
    onChange({
      ...actions,
      transaction: {
        ...actions.transaction,
        [field]: value === null ? undefined : Number(value),
      },
    })
  }

  function handleItemsChange(draft: ClassificationItemDraft[]) {
    onChange({ ...actions, items: draftToRuleItems(draft) })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Skąd (wpłacający)">
          {actionsLocked ? (
            <ReadOnlyField
              value={
                direction === 'EXPENSE'
                  ? ownSideName
                  : partyName(parties, actions.transaction.paidFromPartyId)
              }
              hint={direction === 'EXPENSE' ? OWN_SIDE_HINT : undefined}
            />
          ) : direction === 'EXPENSE' ? (
            <ReadOnlyField value={ownSideName} hint={OWN_SIDE_HINT} />
          ) : (
            <PartySelect
              parties={parties}
              value={actions.transaction.paidFromPartyId ?? null}
              onChange={(v) => setTransactionParty('paidFromPartyId', v)}
              emptyLabel={NO_CHANGE_LABEL}
              className={configSelectCls}
              excludePartyId={actions.transaction.paidToPartyId ?? null}
              onPartyCreated={onPartyCreated}
            />
          )}
        </FieldRow>

        <FieldRow label="Dokąd (odbiorca)">
          {actionsLocked ? (
            <ReadOnlyField
              value={
                direction === 'INCOME'
                  ? ownSideName
                  : partyName(parties, actions.transaction.paidToPartyId)
              }
              hint={direction === 'INCOME' ? OWN_SIDE_HINT : undefined}
            />
          ) : direction === 'INCOME' ? (
            <ReadOnlyField value={ownSideName} hint={OWN_SIDE_HINT} />
          ) : (
            <PartySelect
              parties={parties}
              value={actions.transaction.paidToPartyId ?? null}
              onChange={(v) => setTransactionParty('paidToPartyId', v)}
              emptyLabel={NO_CHANGE_LABEL}
              className={configSelectCls}
              excludePartyId={actions.transaction.paidFromPartyId ?? null}
              onPartyCreated={onPartyCreated}
            />
          )}
        </FieldRow>
      </div>

      <ClassificationItemsEditor
        mode="rule"
        items={itemDraft}
        onChange={handleItemsChange}
        wallets={wallets}
        concerns={concerns}
        categories={categories}
        direction={categoryDirection}
        emptyDictLabel={EMPTY_DICT_LABEL}
        readOnly={actionsLocked}
        showSectionLabel={false}
        allowCategoryQuickAdd={!actionsLocked}
        onCategoryCreated={onCategoryCreated}
      />
    </div>
  )
}
