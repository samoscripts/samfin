export interface RuleListFilters {
  walletId?: string
  concernId?: string
  categoryId?: string
  name?: string
  descriptionCondition?: string
}

export type RuleListTab = 'filters' | null

export function isRuleFilterValueActive(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

export function countActiveRuleFilters(filters: RuleListFilters): number {
  return Object.values(filters).filter(isRuleFilterValueActive).length
}

export const EMPTY_RULE_FILTERS: RuleListFilters = {}
