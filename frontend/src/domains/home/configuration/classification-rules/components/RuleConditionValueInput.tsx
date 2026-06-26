import type { RuleCondition } from '@/shared/api/classificationRules'
import { DIRECTION_OPTIONS, STATUS_OPTIONS } from '@/domains/home/transactions/constants/labels'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { formatListValue, isBetweenValue, parseListValue } from '../ruleConditionMeta'

export interface RuleConditionValueInputProps {
  condition: RuleCondition
  onChange: (value: RuleCondition['value']) => void
}

export default function RuleConditionValueInput({ condition, onChange }: RuleConditionValueInputProps) {
  const { field, operator, value } = condition

  if (operator === 'is_empty' || operator === 'is_not_empty') {
    return null
  }

  if (operator === 'between') {
    const range: [unknown, unknown] = isBetweenValue(value) ? value : ['', '']
    const inputType = field === 'trans_date' ? 'date' : 'number'

    return (
      <FormField label="Od – do" className="flex-[2] min-w-[180px]">
        <div className="flex items-center gap-2">
          <input
            type={inputType}
            className={configInputCls}
            value={String(range[0] ?? '')}
            onChange={(e) => onChange([e.target.value, range[1]])}
          />
          <span className="text-xs text-gray-400 shrink-0">–</span>
          <input
            type={inputType}
            className={configInputCls}
            value={String(range[1] ?? '')}
            onChange={(e) => onChange([range[0], e.target.value])}
          />
        </div>
      </FormField>
    )
  }

  if (operator === 'in' || operator === 'not_in') {
    return (
      <FormField
        label="Wartości (po przecinku)"
        className="flex-[2] min-w-[140px]"
      >
        <input
          className={configInputCls}
          value={formatListValue(value)}
          placeholder="np. a, b, c"
          onChange={(e) => onChange(parseListValue(e.target.value, field))}
        />
      </FormField>
    )
  }

  if (field === 'direction' && (operator === 'equals' || operator === 'not_equals')) {
    return (
      <FormField label="Wartość" className="flex-[2] min-w-[140px]">
        <Select
          className={configSelectCls}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— wybierz —</option>
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FormField>
    )
  }

  if (field === 'classification_status' && (operator === 'equals' || operator === 'not_equals')) {
    return (
      <FormField label="Wartość" className="flex-[2] min-w-[140px]">
        <Select
          className={configSelectCls}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— wybierz —</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FormField>
    )
  }

  const inputType =
    field === 'amount_minor' ? 'number' : field === 'trans_date' ? 'date' : 'text'

  return (
    <FormField label="Wartość" className="flex-[2] min-w-[140px]">
      <input
        type={inputType}
        className={configInputCls}
        value={String(value ?? '')}
        onChange={(e) =>
          onChange(field === 'amount_minor' ? Number(e.target.value) : e.target.value)
        }
      />
    </FormField>
  )
}
