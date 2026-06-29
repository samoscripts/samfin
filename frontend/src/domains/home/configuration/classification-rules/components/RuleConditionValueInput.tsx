import type { RuleCondition } from '@/shared/api/classificationRules'
import { DIRECTION_OPTIONS, STATUS_OPTIONS } from '@/domains/home/transactions/constants/labels'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { minorToMoneyInput, parseMoneyInputToMinor } from '@/shared/utils/moneyInput'
import { formatListValue, isBetweenValue, parseListValue } from '../ruleConditionMeta'

export interface RuleConditionValueInputProps {
  condition: RuleCondition
  onChange: (value: RuleCondition['value']) => void
}

function amountDisplayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number') return minorToMoneyInput(value)
  return String(value)
}

function amountBetweenDisplayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number') return minorToMoneyInput(value)
  return String(value)
}

export default function RuleConditionValueInput({ condition, onChange }: RuleConditionValueInputProps) {
  const { field, operator, value } = condition

  if (operator === 'is_empty' || operator === 'is_not_empty') {
    return null
  }

  if (operator === 'between') {
    const range: [unknown, unknown] = isBetweenValue(value) ? value : ['', '']

    if (field === 'amount_minor') {
      return (
        <FormField label="Od – do (zł)" className="flex-[2] min-w-[180px]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              className={configInputCls}
              placeholder="0,00"
              value={amountBetweenDisplayValue(range[0])}
              onChange={(e) => {
                const minor = parseMoneyInputToMinor(e.target.value)
                onChange([minor ?? e.target.value, range[1]])
              }}
            />
            <span className="text-xs text-gray-400 shrink-0">–</span>
            <input
              type="text"
              inputMode="decimal"
              className={configInputCls}
              placeholder="0,00"
              value={amountBetweenDisplayValue(range[1])}
              onChange={(e) => {
                const minor = parseMoneyInputToMinor(e.target.value)
                onChange([range[0], minor ?? e.target.value])
              }}
            />
          </div>
        </FormField>
      )
    }

    return (
      <FormField label="Od – do" className="flex-[2] min-w-[180px]">
        <div className="flex items-center gap-2">
          <input
            type={field === 'trans_date' ? 'date' : 'text'}
            className={configInputCls}
            value={String(range[0] ?? '')}
            onChange={(e) => onChange([e.target.value, range[1]])}
          />
          <span className="text-xs text-gray-400 shrink-0">–</span>
          <input
            type={field === 'trans_date' ? 'date' : 'text'}
            className={configInputCls}
            value={String(range[1] ?? '')}
            onChange={(e) => onChange([range[0], e.target.value])}
          />
        </div>
      </FormField>
    )
  }

  if (operator === 'in' || operator === 'not_in') {
    const listLabel =
      field === 'amount_minor' ? 'Wartości (po średniku)' : 'Wartości (po przecinku)'
    const listPlaceholder =
      field === 'amount_minor' ? 'np. 21,56; 45,15' : 'np. a, b, c'

    return (
      <FormField label={listLabel} className="flex-[2] min-w-[140px]">
        <input
          className={configInputCls}
          value={formatListValue(value, field)}
          placeholder={listPlaceholder}
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

  if (field === 'amount_minor') {
    return (
      <FormField label="Wartość (zł)" className="flex-[2] min-w-[140px]">
        <input
          type="text"
          inputMode="decimal"
          className={configInputCls}
          placeholder="np. 21,56"
          value={amountDisplayValue(value)}
          onChange={(e) => {
            const minor = parseMoneyInputToMinor(e.target.value)
            onChange(minor ?? e.target.value)
          }}
        />
      </FormField>
    )
  }

  return (
    <FormField label="Wartość" className="flex-[2] min-w-[140px]">
      <input
        type={field === 'trans_date' ? 'date' : 'text'}
        className={configInputCls}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}
