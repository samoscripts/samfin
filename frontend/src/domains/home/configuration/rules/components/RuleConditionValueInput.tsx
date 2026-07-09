import { useEffect, useRef, useState } from 'react'
import type { RuleCondition } from '@/shared/api/classificationRules'
import { DIRECTION_OPTIONS, STATUS_OPTIONS } from '@/domains/home/transactions/constants/labels'
import FormField from '@/shared/components/form/FormField'
import MinorMoneyInput from '@/shared/components/form/MinorMoneyInput'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { formatListValue, isBetweenValue, parseListValue } from '../ruleConditionMeta'

export interface RuleConditionValueInputProps {
  condition: RuleCondition
  onChange: (value: RuleCondition['value']) => void
}

interface AmountMinorListInputProps {
  value: unknown
  onChange: (value: RuleCondition['value']) => void
  placeholder?: string
}

function AmountMinorListInput({ value, onChange, placeholder }: AmountMinorListInputProps) {
  const [text, setText] = useState(() => formatListValue(value, 'amount_minor'))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatListValue(value, 'amount_minor'))
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    onChange(parseListValue(raw, 'amount_minor'))
  }

  function handleFocus() {
    focusedRef.current = true
  }

  function handleBlur() {
    focusedRef.current = false
    const parsed = parseListValue(text, 'amount_minor')
    setText(formatListValue(parsed, 'amount_minor'))
    onChange(parsed)
  }

  return (
    <input
      className={configInputCls}
      value={text}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
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
            <MinorMoneyInput
              value={range[0]}
              onChange={(v) => onChange([v, range[1]])}
              inputClassName={configInputCls}
              placeholder="0,00"
            />
            <span className="text-xs text-gray-400 shrink-0">–</span>
            <MinorMoneyInput
              value={range[1]}
              onChange={(v) => onChange([range[0], v])}
              inputClassName={configInputCls}
              placeholder="0,00"
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
        {field === 'amount_minor' ? (
          <AmountMinorListInput value={value} onChange={onChange} placeholder={listPlaceholder} />
        ) : (
          <input
            className={configInputCls}
            value={formatListValue(value, field)}
            placeholder={listPlaceholder}
            onChange={(e) => onChange(parseListValue(e.target.value, field))}
          />
        )}
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
        <MinorMoneyInput
          value={value}
          onChange={onChange}
          inputClassName={configInputCls}
          placeholder="np. 21,56"
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
