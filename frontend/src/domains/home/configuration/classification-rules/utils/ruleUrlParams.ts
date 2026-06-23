import {
  buildSearchParams,
  parseOptionalString,
  parsePositiveInt,
} from '@/shared/utils/urlQuery'
import type { RuleListFilters, RuleListTab } from '../types/ruleFilters'
import { isRuleFilterValueActive } from '../types/ruleFilters'

export interface RuleListUrlState {
  partyId: number | null
  tab: RuleListTab
  filters: RuleListFilters
}

const VALID_TABS: RuleListTab[] = ['filters', null]

export function parseRuleListSearchParams(params: URLSearchParams): RuleListUrlState {
  const tabRaw = params.get('tab')
  const tab = tabRaw === 'filters' ? 'filters' : null

  const filters: RuleListFilters = {
    walletId: parseOptionalString(params.get('walletId')),
    concernId: parseOptionalString(params.get('concernId')),
    categoryId: parseOptionalString(params.get('categoryId')),
    name: parseOptionalString(params.get('name')),
    descriptionCondition: parseOptionalString(params.get('descriptionCondition')),
  }

  return {
    partyId: parsePositiveInt(params.get('partyId')) ?? null,
    tab: VALID_TABS.includes(tab as RuleListTab) ? tab : null,
    filters,
  }
}

export function serializeRuleListSearchParams(state: RuleListUrlState): URLSearchParams {
  const { partyId, tab, filters } = state

  return buildSearchParams({
    partyId: partyId ?? undefined,
    tab: tab ?? undefined,
    walletId: filters.walletId,
    concernId: filters.concernId,
    categoryId: filters.categoryId,
    name: filters.name?.trim() || undefined,
    descriptionCondition: filters.descriptionCondition?.trim() || undefined,
  })
}

export function cleanRuleFilters(filters: RuleListFilters): RuleListFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => isRuleFilterValueActive(v)),
  ) as RuleListFilters
}

export function isRulePanelOpenFromUrl(state: RuleListUrlState): boolean {
  return state.tab === 'filters'
}
