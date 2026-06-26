import type { ClassificationRule } from '@/shared/api/classificationRules'
import type { RuleListFilters } from '../types/ruleFilters'
import { isRuleFilterValueActive } from '../types/ruleFilters'

function itemMatchesId(
  items: { walletId?: number | null; concernId?: number | null; categoryId?: number | null }[],
  field: 'walletId' | 'concernId' | 'categoryId',
  filterId: string,
): boolean {
  const target = Number.parseInt(filterId, 10)
  if (!Number.isFinite(target)) return false
  return items.some((item) => item[field] === target)
}

function operationDescConditionMatches(rule: ClassificationRule, needle: string): boolean {
  const trimmed = needle.trim()
  if (!trimmed) return true

  const conditions = rule.conditions?.conditions ?? []
  for (const cond of conditions) {
    if (cond.field !== 'trans_description' && cond.field !== 'trans_title') continue
    const value = cond.value
    if (typeof value !== 'string' || value === '') continue

    const caseInsensitive = cond.caseInsensitive !== false
    const hay = caseInsensitive ? value.toLowerCase() : value
    const n = caseInsensitive ? trimmed.toLowerCase() : trimmed
    if (hay.includes(n)) return true
  }

  return false
}

export function ruleMatchesFilters(rule: ClassificationRule, filters: RuleListFilters): boolean {
  if (isRuleFilterValueActive(filters.walletId)) {
    const items = rule.actions?.items ?? []
    if (!itemMatchesId(items, 'walletId', filters.walletId!)) return false
  }

  if (isRuleFilterValueActive(filters.concernId)) {
    const items = rule.actions?.items ?? []
    if (!itemMatchesId(items, 'concernId', filters.concernId!)) return false
  }

  if (isRuleFilterValueActive(filters.categoryId)) {
    const items = rule.actions?.items ?? []
    if (!itemMatchesId(items, 'categoryId', filters.categoryId!)) return false
  }

  if (isRuleFilterValueActive(filters.name)) {
    const needle = filters.name!.trim().toLowerCase()
    if (!rule.name.toLowerCase().includes(needle)) return false
  }

  if (isRuleFilterValueActive(filters.descriptionCondition)) {
    if (!operationDescConditionMatches(rule, filters.descriptionCondition!)) return false
  }

  return true
}

export function filterRules(rules: ClassificationRule[], filters: RuleListFilters): ClassificationRule[] {
  const hasActive = Object.values(filters).some(isRuleFilterValueActive)
  if (!hasActive) return rules
  return rules.filter((r) => ruleMatchesFilters(r, filters))
}

export function nextRulePriority(siblingRules: ClassificationRule[]): number {
  if (siblingRules.length === 0) return 1
  return Math.max(...siblingRules.map((r) => r.priority)) + 1
}

export function sameRuleOrder(a: ClassificationRule[], b: ClassificationRule[]): boolean {
  if (a.length !== b.length) return false
  return a.every((rule, i) => rule.id === b[i]?.id)
}
