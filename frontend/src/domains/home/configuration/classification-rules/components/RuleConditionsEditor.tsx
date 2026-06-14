import type {
  RuleCondition,
  RuleConditionField,
  RuleOperator,
} from '@/shared/api/classificationRules'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configSelectCls } from '@/shared/components/form/formClasses'
import { CONDITION_FIELDS, EMPTY_CONDITION } from '../constants'
import {
  normalizeConditionField,
  normalizeConditionOperator,
  operatorNeedsValue,
  operatorsForField,
} from '../ruleConditionMeta'
import RuleConditionValueInput from './RuleConditionValueInput'

export interface RuleConditionsEditorProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
}

export default function RuleConditionsEditor({ conditions, onChange }: RuleConditionsEditorProps) {
  function updateCondition(i: number, patch: Partial<RuleCondition>) {
    const next = [...conditions]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }

  function setField(i: number, field: RuleConditionField) {
    const next = [...conditions]
    next[i] = normalizeConditionField(next[i], field)
    onChange(next)
  }

  function setOperator(i: number, operator: RuleOperator) {
    const next = [...conditions]
    next[i] = normalizeConditionOperator(next[i], operator)
    onChange(next)
  }

  function removeCondition(i: number) {
    onChange(conditions.filter((_, j) => j !== i))
  }

  function addCondition() {
    onChange([...conditions, { ...EMPTY_CONDITION }])
  }

  return (
    <>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Warunki (AND)</h4>
      <div className="space-y-2 mb-4">
        {conditions.map((cond, i) => {
          const fieldOperators = operatorsForField(cond.field)

          return (
            <div
              key={i}
              className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40"
            >
              <FormField label="Pole" className="flex-1 min-w-[120px]">
                <Select
                  className={configSelectCls}
                  value={cond.field}
                  onChange={(e) => setField(i, e.target.value as RuleConditionField)}
                >
                  {CONDITION_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Operator" className="flex-1 min-w-[120px]">
                <Select
                  className={configSelectCls}
                  value={cond.operator}
                  onChange={(e) => setOperator(i, e.target.value as RuleOperator)}
                >
                  {fieldOperators.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              {operatorNeedsValue(cond.operator) && (
                <RuleConditionValueInput
                  condition={cond}
                  onChange={(value) => updateCondition(i, { value })}
                />
              )}
              {conditions.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-500 px-2 py-2"
                  onClick={() => removeCondition(i)}
                >
                  Usuń
                </button>
              )}
            </div>
          )
        })}
        <button
          type="button"
          className="text-xs text-[#c9a96e] hover:underline"
          onClick={addCondition}
        >
          + Dodaj warunek
        </button>
      </div>
    </>
  )
}
