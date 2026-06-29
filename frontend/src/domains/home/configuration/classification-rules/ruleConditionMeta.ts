import type {
  RuleCondition,
  RuleConditionField,
  RuleOperator,
} from '@/shared/api/classificationRules'
import { minorToMoneyInput, parseMoneyInputToMinor } from '@/shared/utils/moneyInput'
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
    return field === 'amount_minor' ? ['', ''] : ['', '']
  }
  if (operator === 'in' || operator === 'not_in') return []
  if (field === 'amount_minor') return ''
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

function formatListValue(value: unknown, field?: RuleConditionField): string {
  if (Array.isArray(value)) {
    if (field === 'amount_minor') {
      return value
        .map((item) => (typeof item === 'number' ? minorToMoneyInput(item) : String(item ?? '')))
        .join('; ')
    }
    return value.map(String).join(', ')
  }
  return String(value ?? '')
}

function parseListValue(raw: string, field: RuleConditionField): unknown[] {
  if (field === 'amount_minor') {
    return raw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((part) => parseMoneyInputToMinor(part))
      .filter((minor): minor is number => minor !== null)
  }

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isValidAmountMinorValue(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true
  if (typeof value === 'string' && value !== '') {
    return parseMoneyInputToMinor(value) !== null
  }
  return false
}

function amountMinorBetweenBoundsValid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 2) return false
  return isValidAmountMinorValue(value[0]) && isValidAmountMinorValue(value[1])
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
      if (c.field === 'amount_minor' && !amountMinorBetweenBoundsValid(v)) {
        return `${label}: granice zakresu muszą być kwotami w PLN (np. 21,56).`
      }
      continue
    }

    if (c.operator === 'in' || c.operator === 'not_in') {
      if (!Array.isArray(v) || v.length === 0) {
        return `${label}: podaj co najmniej jedną wartość na liście.`
      }
      if (c.field === 'amount_minor' && v.some((item) => !isValidAmountMinorValue(item))) {
        return `${label}: wartości listy muszą być kwotami w PLN (np. 21,56; 45,15).`
      }
      continue
    }

    if (v === undefined || v === null || v === '') {
      return `${label}: podaj wartość.`
    }

    if (c.field === 'amount_minor' && !isValidAmountMinorValue(v)) {
      return `${label}: podaj kwotę w PLN (np. 21,56).`
    }
  }

  return null
}

export function isBetweenValue(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2
}

function coerceAmountMinorValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(Math.round(value))
  }
  if (typeof value === 'string') {
    const minor = parseMoneyInputToMinor(value)
    if (minor !== null) return minor
  }
  return 0
}

/** Ensure amount_minor condition values are positive minor units before API save. */
export function normalizeAmountConditionsForApi(conditions: RuleCondition[]): RuleCondition[] {
  return conditions.map((c) => {
    if (
      c.field !== 'amount_minor' ||
      c.operator === 'is_empty' ||
      c.operator === 'is_not_empty'
    ) {
      return c
    }

    const v = c.value

    if (c.operator === 'between' && Array.isArray(v) && v.length === 2) {
      return {
        ...c,
        value: [coerceAmountMinorValue(v[0]), coerceAmountMinorValue(v[1])],
      }
    }

    if ((c.operator === 'in' || c.operator === 'not_in') && Array.isArray(v)) {
      return { ...c, value: v.map((item) => coerceAmountMinorValue(item)) }
    }

    return { ...c, value: coerceAmountMinorValue(v) }
  })
}

export { formatListValue, parseListValue }
