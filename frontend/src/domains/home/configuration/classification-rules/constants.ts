import type { ClassificationRule, ClassificationRulePayload, RuleActionsPayload, RuleCondition, RuleConditionField, RuleItemAction, RuleOperator } from '@/shared/api/classificationRules'
import type { ClassificationItemDraft } from '@/shared/components/classification/ClassificationItemsEditor'
import { DEFAULT_SPLIT_PERCENT } from '@/shared/utils/splitAllocation'
import { createDirectionCondition, ensureDirectionCondition, extractDirectionFromConditions } from './ruleConditionMeta'

export type RuleDirection = 'EXPENSE' | 'INCOME' | ''

export const CONDITION_FIELDS: { value: RuleConditionField; label: string }[] = [
  { value: 'direction', label: 'Kierunek' },
  { value: 'description', label: 'Opis' },
  { value: 'amount_minor', label: 'Kwota (grosze)' },
  { value: 'operation_date', label: 'Data operacji' },
  { value: 'classification_status', label: 'Status klasyfikacji' },
  { value: 'counterparty_account_number', label: 'NRB kontrahenta' },
]



export const OPERATORS: { value: RuleOperator; label: string }[] = [

  { value: 'equals', label: 'równa się' },

  { value: 'not_equals', label: 'nie równa się' },

  { value: 'contains', label: 'zawiera' },

  { value: 'not_contains', label: 'nie zawiera' },

  { value: 'starts_with', label: 'zaczyna się od' },

  { value: 'ends_with', label: 'kończy się na' },

  { value: 'greater_than', label: 'większe niż' },

  { value: 'greater_or_equal', label: 'większe lub równe' },

  { value: 'less_than', label: 'mniejsze niż' },

  { value: 'less_or_equal', label: 'mniejsze lub równe' },

  { value: 'between', label: 'między' },

  { value: 'in', label: 'na liście' },

  { value: 'not_in', label: 'poza listą' },

  { value: 'is_empty', label: 'jest puste' },

  { value: 'is_not_empty', label: 'nie jest puste' },

]



export const EMPTY_CONDITION: RuleCondition = {

  field: 'description',

  operator: 'contains',

  value: '',

  caseInsensitive: true,

}



/** Domyślny warunek dodawany ręcznie w trybie „reguła z transakcji” (nie duplikuje opisu). */

export const DEFAULT_MANUAL_CONDITION: RuleCondition = {

  field: 'amount_minor',

  operator: 'equals',

  value: 0,

}



export const EMPTY_ITEM: RuleItemAction = {

  percent: 100,

  walletId: null,

  concernId: null,

  categoryId: null,

}



export type FormState = ClassificationRulePayload



export function defaultForm(): FormState {
  return {
    name: '',
    description: null,
    priority: 100,
    enabled: true,
    stopOnMatch: true,
    conditions: { conditions: [createDirectionCondition('')] },
    actions: {
      transaction: {},
      items: [{ ...EMPTY_ITEM }],
    },
  }
}

export function ruleToForm(rule: ClassificationRule): FormState {
  const direction =
    extractDirectionFromConditions(rule.conditions.conditions) || inferDirectionFromRule(rule)

  return {
    name: rule.name,
    description: rule.description,
    priority: rule.priority,
    enabled: rule.enabled,
    stopOnMatch: rule.stopOnMatch,
    conditions: {
      conditions: ensureDirectionCondition(rule.conditions.conditions, direction),
    },
    actions: rule.actions,
  }
}

export function inferDirectionFromRule(rule: ClassificationRule): RuleDirection {
  const fromConditions = extractDirectionFromConditions(rule.conditions.conditions)
  if (fromConditions !== '') return fromConditions

  if (rule.actions.transaction.paidToPartyId === rule.partyId) {
    return 'INCOME'
  }

  if (rule.actions.transaction.paidFromPartyId === rule.partyId) {
    return 'EXPENSE'
  }

  return 'EXPENSE'
}



export function applyOwnSideToActions(

  actions: RuleActionsPayload,

  direction: RuleDirection,

  contextPartyId: number,

): RuleActionsPayload {

  const tx = { ...actions.transaction }



  if (direction === 'EXPENSE') {

    tx.paidFromPartyId = contextPartyId

    if (tx.paidToPartyId === contextPartyId) {

      tx.paidToPartyId = undefined

    }

  } else if (direction === 'INCOME') {

    tx.paidToPartyId = contextPartyId

    if (tx.paidFromPartyId === contextPartyId) {

      tx.paidFromPartyId = undefined

    }

  }



  return { ...actions, transaction: tx }

}



export function ruleItemsToDraft(items: RuleItemAction[]): ClassificationItemDraft[] {

  if (items.length === 1) {

    return [{

      walletId: items[0].walletId ?? null,

      concernId: items[0].concernId ?? null,

      categoryId: items[0].categoryId ?? null,

    }]

  }



  const p0 = items[0]?.percent ?? DEFAULT_SPLIT_PERCENT

  const p1 = items[1]?.percent ?? 100 - p0



  return items.map((item, i) => ({

    walletId: item.walletId ?? null,

    concernId: item.concernId ?? null,

    categoryId: item.categoryId ?? null,

    percent: i === 0 ? p0 : p1,

  }))

}



export function draftToRuleItems(draft: ClassificationItemDraft[]): RuleItemAction[] {

  if (draft.length === 1) {

    return [{

      percent: 100,

      walletId: draft[0].walletId,

      concernId: draft[0].concernId,

      categoryId: draft[0].categoryId,

    }]

  }



  const p0 = draft[0].percent ?? DEFAULT_SPLIT_PERCENT

  const p1 = draft[1]?.percent ?? 100 - p0



  return [

    {

      percent: p0,

      walletId: draft[0].walletId,

      concernId: draft[0].concernId,

      categoryId: draft[0].categoryId,

    },

    {

      percent: p1,

      walletId: draft[1].walletId,

      concernId: draft[1].concernId,

      categoryId: draft[1].categoryId,

    },

  ]

}



export function mergeDraftIntoActions(actions: RuleActionsPayload, draft: ClassificationItemDraft[]): RuleActionsPayload {

  return { ...actions, items: draftToRuleItems(draft) }

}


