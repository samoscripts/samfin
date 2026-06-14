import type { RuleActionsPayload, RuleItemAction } from '@/shared/api/classificationRules'
import type { Party } from '@/domains/home/configuration/parties/types'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import type { RuleDirection } from '../constants'

const NO_CHANGE_LABEL = '— bez zmiany —'
const EMPTY_DICT_LABEL = '—'

export interface RuleActionsEditorProps {
  actions: RuleActionsPayload
  direction: RuleDirection
  contextPartyId: number | null
  ruleContextParties: Party[]
  parties: Party[]
  wallets: { id: number; name: string }[]
  concerns: { id: number; name: string }[]
  categories: { id: number; name: string }[]
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

  function setItem(i: number, patch: Partial<RuleItemAction>) {
    const items = [...actions.items]
    items[i] = { ...items[i], ...patch }
    onChange({ ...actions, items })
  }

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

  return (
    <>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Akcje</h4>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <FormField label={direction === 'INCOME' ? 'Skąd (paidFrom)' : 'Skąd (własna strona)'}>
          {direction === 'EXPENSE' ? (
            <input
              className={configInputCls}
              value={ownSideName}
              readOnly
              tabIndex={-1}
            />
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
        </FormField>
        <FormField label={direction === 'EXPENSE' ? 'Dokąd (paidTo)' : 'Dokąd (własna strona)'}>
          {direction === 'INCOME' ? (
            <input
              className={configInputCls}
              value={ownSideName}
              readOnly
              tabIndex={-1}
            />
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
        </FormField>
      </div>

      <div className="space-y-2 mb-4">
        {actions.items.map((item, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <FormField label="Split">
                <Select
                  className={configSelectCls}
                  value={item.split.type}
                  onChange={(e) =>
                    setItem(i, {
                      split: {
                        type: e.target.value as RuleItemAction['split']['type'],
                        value: item.split.value,
                      },
                    })
                  }
                >
                  <option value="FULL">FULL</option>
                  <option value="PERCENT">PERCENT</option>
                  <option value="REMAINDER">REMAINDER</option>
                </Select>
              </FormField>
              {item.split.type === 'PERCENT' && (
                <FormField label="%">
                  <input
                    type="number"
                    className={configInputCls}
                    value={item.split.value ?? ''}
                    onChange={(e) =>
                      setItem(i, { split: { type: 'PERCENT', value: Number(e.target.value) } })
                    }
                  />
                </FormField>
              )}
              <FormField label="Portfel">
                <DictionarySelect
                  items={wallets}
                  value={item.walletId}
                  onChange={(v) => setItem(i, { walletId: v === null ? null : Number(v) })}
                  emptyLabel={EMPTY_DICT_LABEL}
                  valueType="number"
                  className={configSelectCls}
                />
              </FormField>
              <FormField label="Dotyczy">
                <DictionarySelect
                  items={concerns}
                  value={item.concernId}
                  onChange={(v) => setItem(i, { concernId: v === null ? null : Number(v) })}
                  emptyLabel={EMPTY_DICT_LABEL}
                  valueType="number"
                  className={configSelectCls}
                />
              </FormField>
              <FormField label="Kategoria">
                <DictionarySelect
                  items={categories}
                  value={item.categoryId}
                  onChange={(v) => setItem(i, { categoryId: v === null ? null : Number(v) })}
                  emptyLabel={EMPTY_DICT_LABEL}
                  valueType="number"
                  className={configSelectCls}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
