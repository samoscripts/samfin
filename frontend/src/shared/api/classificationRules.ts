import api from './client'
import type { TransactionFilters } from './transactions'

export type RuleConditionField =
  | 'description'
  | 'direction'
  | 'amount_minor'
  | 'operation_date'
  | 'classification_status'
  | 'counterparty_account_number'

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'

export interface RuleCondition {
  field: RuleConditionField
  operator: RuleOperator
  value?: unknown
  caseInsensitive?: boolean
}

export interface RuleConditionsPayload {
  conditions: RuleCondition[]
}

export type RuleSplitType = 'FULL' | 'PERCENT' | 'REMAINDER'

export interface RuleItemAction {
  split: { type: RuleSplitType; value?: number }
  walletId?: number | null
  concernId?: number | null
  categoryId?: number | null
  description?: string | null
}

export interface RuleActionsPayload {
  transaction: {
    paidFromPartyId?: number | null
    paidToPartyId?: number | null
  }
  items: RuleItemAction[]
}

export interface ClassificationRule {
  id: number
  partyId: number
  partyName: string | null
  name: string
  description: string | null
  priority: number
  enabled: boolean
  stopOnMatch: boolean
  conditions: RuleConditionsPayload
  actions: RuleActionsPayload
  createdFromTransactionId: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ClassificationRulePayload = {
  name: string
  description?: string | null
  priority: number
  enabled: boolean
  stopOnMatch: boolean
  conditions: RuleConditionsPayload
  actions: RuleActionsPayload
  partyId?: number
  createdFromTransactionId?: number | null
}

export interface ApplyClassificationRulesPayload {
  transactionIds?: number[]
  filters?: TransactionFilters | null
  overwrite: boolean
}

export interface ApplyClassificationRulesResult {
  applied: number
  skipped: number
  noPartyContext: number
  errors: Record<number, string>
}

export const fetchAllClassificationRules = async (): Promise<ClassificationRule[]> =>
  (await api.get<ClassificationRule[]>('/classification-rules')).data

export const fetchClassificationRules = async (partyId: number): Promise<ClassificationRule[]> =>
  (await api.get<ClassificationRule[]>(`/parties/${partyId}/classification-rules`)).data

export const fetchClassificationRule = async (
  partyId: number,
  id: number,
): Promise<ClassificationRule> =>
  (await api.get<ClassificationRule>(`/parties/${partyId}/classification-rules/${id}`)).data

export const createClassificationRule = async (
  partyId: number,
  payload: ClassificationRulePayload,
): Promise<ClassificationRule> =>
  (await api.post<ClassificationRule>(`/parties/${partyId}/classification-rules`, payload)).data

export const updateClassificationRule = async (
  partyId: number,
  id: number,
  payload: Partial<ClassificationRulePayload>,
): Promise<ClassificationRule> =>
  (await api.put<ClassificationRule>(`/parties/${partyId}/classification-rules/${id}`, payload)).data

export const deleteClassificationRule = async (partyId: number, id: number): Promise<void> => {
  await api.delete(`/parties/${partyId}/classification-rules/${id}`)
}

export const applyClassificationRules = async (
  payload: ApplyClassificationRulesPayload,
): Promise<ApplyClassificationRulesResult> =>
  (await api.post<ApplyClassificationRulesResult>('/transactions/apply-classification-rules', payload)).data
