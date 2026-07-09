import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RuleListFilters, RuleListTab } from '../types/ruleFilters'
import {
  isRulePanelOpenFromUrl,
  parseRuleListSearchParams,
  serializeRuleListSearchParams,
  type RuleListUrlState,
} from '../utils/ruleUrlParams'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

type UrlPatch = Partial<RuleListUrlState>

export function useClassificationRulesListUrl() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlState = useMemo(
    () => parseRuleListSearchParams(searchParams),
    [searchParams],
  )

  const applyUrl = useCallback(
    (patch: UrlPatch, options?: { replace?: boolean }) => {
      const next: RuleListUrlState = { ...urlState, ...patch }
      const serialized = serializeRuleListSearchParams(next)
      if (searchParamsEqual(searchParams, serialized)) return
      setSearchParams(serialized, { replace: options?.replace ?? true })
    },
    [searchParams, setSearchParams, urlState],
  )

  const setPartyId = useCallback(
    (partyId: number | null) => {
      applyUrl({ partyId })
    },
    [applyUrl],
  )

  const setFilters = useCallback(
    (filters: RuleListFilters) => {
      applyUrl({ filters })
    },
    [applyUrl],
  )

  const openFiltersTab = useCallback(() => {
    applyUrl({ tab: 'filters' })
  }, [applyUrl])

  const closePanel = useCallback(() => {
    applyUrl({ tab: null })
  }, [applyUrl])

  const setTab = useCallback(
    (tab: RuleListTab) => {
      applyUrl({ tab })
    },
    [applyUrl],
  )

  const panelOpen = isRulePanelOpenFromUrl(urlState)

  const listQueryString = useMemo(() => {
    const serialized = serializeRuleListSearchParams(urlState)
    const s = serialized.toString()
    return s ? `?${s}` : ''
  }, [urlState])

  return {
    ...urlState,
    panelOpen,
    listQueryString,
    applyUrl,
    setPartyId,
    setFilters,
    openFiltersTab,
    closePanel,
    setTab,
  }
}
