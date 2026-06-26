import type {
  RuleCondition,
  RuleConditionField,
  RuleOperator,
} from '@/shared/api/classificationRules'
import { DIRECTION_OPTIONS } from '@/domains/home/transactions/constants/labels'
import FormField from '@/shared/components/form/FormField'
import { ReadOnlyField } from '@/shared/components/form/FormSection'
import Select from '@/shared/components/form/Select'
import { configSelectCls } from '@/shared/components/form/formClasses'
import type { RuleDirection } from '../constants'
import {
  CONDITION_FIELDS,
  DEFAULT_MANUAL_CONDITION,
  EMPTY_CONDITION,
} from '../constants'
import {
  ensureDirectionCondition,
  extractDirectionFromConditions,
  normalizeConditionField,
  normalizeConditionOperator,
  operatorNeedsValue,
  operatorsForField,
  stripDirectionCondition,
} from '../ruleConditionMeta'
import type { TransactionConditionSeeds } from '../utils/ruleFromTransaction'
import RuleConditionValueInput from './RuleConditionValueInput'

export interface RuleConditionsEditorProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
  fromTransaction?: boolean
  transactionSeeds?: TransactionConditionSeeds
  onTransactionSeedsChange?: (seeds: TransactionConditionSeeds) => void
}

function fieldLabel(field: RuleConditionField): string {
  return CONDITION_FIELDS.find((f) => f.value === field)?.label ?? field
}

function operatorLabel(operator: RuleOperator): string {
  const labels: Partial<Record<RuleOperator, string>> = {
    equals: 'równa się',
    contains: 'zawiera',
    starts_with: 'zaczyna się od',
    ends_with: 'kończy się na',
    not_equals: 'nie równa się',
    not_contains: 'nie zawiera',
    is_empty: 'jest puste',
    is_not_empty: 'nie jest puste',
  }
  return labels[operator] ?? operator
}

function firstIndexOfField(conditions: RuleCondition[], field: RuleConditionField): number {
  return conditions.findIndex((c) => c.field === field)
}

function isSeededTransTitleRow(
  index: number,
  conditions: RuleCondition[],
  seeds: TransactionConditionSeeds,
): boolean {
  return seeds.transTitle && firstIndexOfField(conditions, 'trans_title') === index
}

function isSeededCounterpartyRow(
  index: number,
  conditions: RuleCondition[],
  seeds: TransactionConditionSeeds,
): boolean {
  return (
    seeds.counterparty && firstIndexOfField(conditions, 'counterparty_account_number') === index
  )
}

function selectableFields(fromTransaction: boolean, manualRow: boolean): typeof CONDITION_FIELDS {
  const withoutDirection = CONDITION_FIELDS.filter((f) => f.value !== 'direction')
  if (!fromTransaction || !manualRow) {
    return withoutDirection
  }
  return withoutDirection.filter((f) => f.value !== 'counterparty_account_number')
}

export default function RuleConditionsEditor({
  conditions,
  onChange,
  fromTransaction = false,
  transactionSeeds,
  onTransactionSeedsChange,
}: RuleConditionsEditorProps) {
  const seeds = transactionSeeds ?? { transTitle: false, transDescription: false, counterparty: false, counterpartyName: false }
  const normalized = ensureDirectionCondition(conditions)
  const direction = extractDirectionFromConditions(normalized)
  const additional = stripDirectionCondition(normalized)

  function emit(nextAdditional: RuleCondition[], nextDirection?: RuleDirection) {
    onChange(ensureDirectionCondition(nextAdditional, nextDirection ?? direction))
  }

  function updateAdditional(i: number, patch: Partial<RuleCondition>) {
    const next = [...additional]
    next[i] = { ...next[i], ...patch }
    emit(next)
  }

  function setAdditionalField(i: number, field: RuleConditionField) {
    const next = [...additional]
    next[i] = normalizeConditionField(next[i], field)
    emit(next)
  }

  function setAdditionalOperator(i: number, operator: RuleOperator) {
    const next = [...additional]
    next[i] = normalizeConditionOperator(next[i], operator)
    emit(next)
  }

  function removeAdditional(i: number) {
    const globalIndex = i + 1
    if (fromTransaction && onTransactionSeedsChange) {
      const nextSeeds = { ...seeds }
      if (isSeededTransTitleRow(globalIndex, normalized, seeds)) {
        nextSeeds.transTitle = false
      }
      if (isSeededCounterpartyRow(globalIndex, normalized, seeds)) {
        nextSeeds.counterparty = false
      }
      onTransactionSeedsChange(nextSeeds)
    }
    emit(additional.filter((_, j) => j !== i))
  }

  function addCondition() {
    const next = fromTransaction
      ? { ...DEFAULT_MANUAL_CONDITION }
      : { ...EMPTY_CONDITION }
    emit([...additional, next])
  }

  function setDirection(nextDirection: RuleDirection) {
    emit(additional, nextDirection)
  }

  return (
    <>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Kierunek jest wymagany. Pozostałe warunki są łączone operatorem AND.
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
          <FormField label="Pole" className="flex-1 min-w-[120px]">
            <ReadOnlyField value="Kierunek" />
          </FormField>
          <FormField label="Operator" className="flex-1 min-w-[120px]">
            <ReadOnlyField value="równa się" />
          </FormField>
          <FormField label="Wartość" className="flex-[2] min-w-[140px]" required>
            {fromTransaction ? (
              <ReadOnlyField
                value={DIRECTION_OPTIONS.find((o) => o.value === direction)?.label ?? '—'}
              />
            ) : (
              <Select
                className={configSelectCls}
                value={direction}
                onChange={(e) => setDirection(e.target.value as RuleDirection)}
                required
              >
                <option value="">— wybierz kierunek —</option>
                {DIRECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>

        {additional.length > 0 && (
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-2">
            Warunki dodatkowe (AND)
          </h4>
        )}

        {additional.map((cond, i) => {
          const globalIndex = i + 1
          const fieldOperators = operatorsForField(cond.field)
          const seededTitle = fromTransaction && isSeededTransTitleRow(globalIndex, normalized, seeds)
          const seededNrb = fromTransaction && isSeededCounterpartyRow(globalIndex, normalized, seeds)
          const manualRow = !seededTitle && !seededNrb
          const fields = selectableFields(fromTransaction, manualRow)

          return (
            <div
              key={globalIndex}
              className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40"
            >
              <FormField label="Pole" className="flex-1 min-w-[120px]">
                {seededTitle || seededNrb ? (
                  <ReadOnlyField value={fieldLabel(cond.field)} />
                ) : (
                  <Select
                    className={configSelectCls}
                    value={cond.field}
                    onChange={(e) => setAdditionalField(i, e.target.value as RuleConditionField)}
                  >
                    {fields.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField label="Operator" className="flex-1 min-w-[120px]">
                {seededNrb ? (
                  <ReadOnlyField value={operatorLabel(cond.operator)} />
                ) : (
                  <Select
                    className={configSelectCls}
                    value={cond.operator}
                    onChange={(e) => setAdditionalOperator(i, e.target.value as RuleOperator)}
                  >
                    {fieldOperators.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              {operatorNeedsValue(cond.operator) &&
                (seededNrb ? (
                  <FormField label="Wartość" className="flex-[2] min-w-[140px]">
                    <ReadOnlyField value={String(cond.value ?? '')} />
                  </FormField>
                ) : (
                  <RuleConditionValueInput
                    condition={cond}
                    onChange={(value) => updateAdditional(i, { value })}
                  />
                ))}
              <button
                type="button"
                className="text-xs text-red-500 px-2 py-2"
                onClick={() => removeAdditional(i)}
              >
                Usuń
              </button>
            </div>
          )
        })}

        <button
          type="button"
          className="text-xs text-[#c9a96e] hover:underline"
          onClick={addCondition}
        >
          + Dodaj warunek dodatkowy
        </button>
      </div>
    </>
  )
}
