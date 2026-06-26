import type {
  RuleCondition,
  RuleConditionField,
  RuleOperator,
} from '@/shared/api/classificationRules'
import type { RuleDirection } from './constants'
import { OPERATORS } from './constants'

export function createDirectionCondition(direction: RuleDirection | string = ''): RuleCondition {
  return {
    field: 'direction',
    operator: 'equals',
    value: direction,
  }
}

export function isDirectionCondition(condition: RuleCondition): boolean {
  return condition.field === 'direction'
}

export function extractDirectionFromConditions(conditions: RuleCondition[]): RuleDirection {
  const value = conditions.find(isDirectionCondition)?.value
  if (value === 'EXPENSE' || value === 'INCOME') return value
  return ''
}

export function stripDirectionCondition(conditions: RuleCondition[]): RuleCondition[] {
  return conditions.filter((c) => !isDirectionCondition(c))
}

export function ensureDirectionCondition(
  conditions: RuleCondition[],
  direction?: RuleDirection,
): RuleCondition[] {
  const resolved = direction ?? extractDirectionFromConditions(conditions)
  return [createDirectionCondition(resolved), ...stripDirectionCondition(conditions)]
}

export function additionalConditionsCount(conditions: RuleCondition[]): number {
  return stripDirectionCondition(conditions).length
}

const TEXT_FIELDS: RuleConditionField[] = [
  'trans_description',
  'trans_title',
  'counterparty_name',
  'counterparty_account_number',
]

const TEXT_OPERATORS: RuleOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'is_empty',
  'is_not_empty',
]

const ENUM_OPERATORS: RuleOperator[] = ['equals', 'not_equals', 'in', 'not_in']

const NUMERIC_OPERATORS: RuleOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'greater_or_equal',
  'less_than',
  'less_or_equal',
  'between',
  'in',
  'not_in',
  'is_empty',
  'is_not_empty',
]

const DATE_OPERATORS: RuleOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'greater_or_equal',
  'less_than',
  'less_or_equal',
  'between',
  'is_empty',
  'is_not_empty',
]

const OPERATORS_BY_FIELD: Record<RuleConditionField, RuleOperator[]> = {
  trans_description: TEXT_OPERATORS,
  trans_title: TEXT_OPERATORS,
  counterparty_name: TEXT_OPERATORS,
  counterparty_account_number: TEXT_OPERATORS,
  direction: ENUM_OPERATORS,
  classification_status: ENUM_OPERATORS,
  amount_minor: NUMERIC_OPERATORS,
  trans_date: DATE_OPERATORS,
}

export function operatorsForField(field: RuleConditionField) {
  const allowed = new Set(OPERATORS_BY_FIELD[field])
  return OPERATORS.filter((o) => allowed.has(o.value))
}

export function operatorNeedsValue(operator: RuleOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty'
}

export function defaultValueForOperator(
  field: RuleConditionField,
  operator: RuleOperator,
): RuleCondition['value'] {
  if (!operatorNeedsValue(operator)) return undefined
  if (operator === 'between') {
    return field === 'amount_minor' ? [0, 0] : ['', '']
  }
  if (operator === 'in' || operator === 'not_in') return []
  if (field === 'amount_minor') return 0
  return ''
}

export function normalizeConditionField(
  condition: RuleCondition,
  field: RuleConditionField,
): RuleCondition {
  const allowed = OPERATORS_BY_FIELD[field]
  const operator = allowed.includes(condition.operator) ? condition.operator : allowed[0]

  return {
    ...condition,
    field,
    operator,
    value: defaultValueForOperator(field, operator),
    caseInsensitive: TEXT_FIELDS.includes(field) ? condition.caseInsensitive ?? true : undefined,
  }
}

export function normalizeConditionOperator(
  condition: RuleCondition,
  operator: RuleOperator,
): RuleCondition {
  return {
    ...condition,
    operator,
    value: defaultValueForOperator(condition.field, operator),
  }
}

function formatListValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value ?? '')
}

function parseListValue(raw: string, field: RuleConditionField): unknown[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (field === 'amount_minor') {
    return parts.map((p) => Number(p))
  }
  return parts
}

export function validateConditions(conditions: RuleCondition[]): string | null {
  if (conditions.length === 0) {
    return 'Dodaj co najmniej jeden warunek.'
  }

  const first = conditions[0]
  if (!isDirectionCondition(first) || first.operator !== 'equals') {
    return 'Pierwszy warunek musi być kierunkiem transakcji.'
  }
  if (first.value !== 'EXPENSE' && first.value !== 'INCOME') {
    return 'Wybierz kierunek transakcji (wydatek lub wpływ).'
  }

  for (let i = 1; i < conditions.length; i++) {
    const c = conditions[i]
    const label = `Warunek dodatkowy ${i}`

    if (!OPERATORS_BY_FIELD[c.field].includes(c.operator)) {
      return `${label}: operator „${c.operator}" nie jest dozwolony dla tego pola.`
    }

    if (!operatorNeedsValue(c.operator)) continue

    const v = c.value

    if (c.operator === 'between') {
      if (!Array.isArray(v) || v.length !== 2 || v[0] === '' || v[1] === '') {
        return `${label}: podaj obie granice zakresu (od–do).`
      }
      if (c.field === 'amount_minor' && (Number.isNaN(Number(v[0])) || Number.isNaN(Number(v[1])))) {
        return `${label}: granice zakresu muszą być liczbami.`
      }
      continue
    }

    if (c.operator === 'in' || c.operator === 'not_in') {
      if (!Array.isArray(v) || v.length === 0) {
        return `${label}: podaj co najmniej jedną wartość na liście.`
      }
      continue
    }

    if (v === undefined || v === null || v === '') {
      return `${label}: podaj wartość.`
    }
  }

  return null
}

export function isBetweenValue(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2
}

export { formatListValue, parseListValue }
