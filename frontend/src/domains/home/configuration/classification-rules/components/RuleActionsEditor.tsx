import type { RuleActionsPayload } from '@/shared/api/classificationRules'
import type { Party } from '@/domains/home/configuration/parties/types'
import type { Category } from '@/shared/api/categories'
import ClassificationItemsEditor, {
  type ClassificationItemDraft,
} from '@/shared/components/classification/ClassificationItemsEditor'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { FieldRow, ReadOnlyField, SectionLabel } from '@/shared/components/form/FormSection'
import { configSelectCls } from '@/shared/components/form/formClasses'
import { filterCategoriesForDirection } from '@/domains/home/transactions/utils/categoryOptions'
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
}: RuleActionsEditorProps) {
  const ownSideName =
    contextPartyId !== null
      ? (ruleContextParties.find((p) => p.id === contextPartyId)?.name ?? '—')
      : '—'

  const itemDraft = ruleItemsToDraft(actions.items)
  const relevantCategories =
    direction === 'EXPENSE' || direction === 'INCOME'
      ? filterCategoriesForDirection(categories, direction)
      : categories

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
    <>
      <div className="space-y-3 mb-6">
        <SectionLabel>Strony transakcji</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Skąd (wpłacający)">
            {direction === 'EXPENSE' ? (
              <ReadOnlyField value={ownSideName} hint={OWN_SIDE_HINT} />
            ) : (
              <DictionarySelect
                items={parties}
                value={actions.transaction.paidFromPartyId}
                onChange={(v) => setTransactionParty('paidFromPartyId', v)}
                emptyLabel={NO_CHANGE_LABEL}
                valueType="number"
                className={configSelectCls}
              />
            )}
          </FieldRow>
          <FieldRow label="Dokąd (odbiorca)">
            {direction === 'INCOME' ? (
              <ReadOnlyField value={ownSideName} hint={OWN_SIDE_HINT} />
            ) : (
              <DictionarySelect
                items={parties}
                value={actions.transaction.paidToPartyId}
                onChange={(v) => setTransactionParty('paidToPartyId', v)}
                emptyLabel={NO_CHANGE_LABEL}
                valueType="number"
                className={configSelectCls}
              />
            )}
          </FieldRow>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 mb-6" />

      <ClassificationItemsEditor
        mode="rule"
        items={itemDraft}
        onChange={handleItemsChange}
        wallets={wallets}
        concerns={concerns}
        categories={relevantCategories}
        emptyDictLabel={EMPTY_DICT_LABEL}
      />
    </>
  )
}
