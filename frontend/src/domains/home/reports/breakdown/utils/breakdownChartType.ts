import type { BreakdownChartTab, BreakdownDirections } from '@/domains/home/reports/shared/types/breakdown'
import { hasBothBreakdownDirections } from '@/domains/home/reports/breakdown/utils/breakdownUrl'

const VALID_CHART_TABS = new Set<BreakdownChartTab>([
  'vertical',
  'horizontal',
  'donut',
  'stacked',
  'grouped',
  'diverging',
  'balance',
  'table',
])

const SINGLE_DIRECTION_TABS: BreakdownChartTab[] = ['vertical', 'horizontal', 'donut', 'table']

const BOTH_DIRECTIONS_TABS: BreakdownChartTab[] = ['stacked', 'grouped', 'diverging', 'balance', 'table']

export const BREAKDOWN_CHART_TAB_LABELS: Record<BreakdownChartTab, string> = {
  vertical: 'Słupkowy pionowy',
  horizontal: 'Słupkowy poziomy',
  donut: 'Kołowy',
  stacked: 'Skumulowany',
  grouped: 'Skojarzony',
  diverging: 'Zwierciadlany',
  balance: 'Bilans',
  table: 'Tabela',
}

export function parseBreakdownChartTab(raw: string | null): BreakdownChartTab | null {
  if (raw && VALID_CHART_TABS.has(raw as BreakdownChartTab)) {
    return raw as BreakdownChartTab
  }
  return null
}

export function defaultBreakdownChartTab(directions: BreakdownDirections): BreakdownChartTab {
  return hasBothBreakdownDirections(directions) ? 'stacked' : 'vertical'
}

export function isBreakdownChartTabAvailable(
  tab: BreakdownChartTab,
  directions: BreakdownDirections,
): boolean {
  const both = hasBothBreakdownDirections(directions)
  if (both) return BOTH_DIRECTIONS_TABS.includes(tab)
  return SINGLE_DIRECTION_TABS.includes(tab)
}

export function visibleBreakdownChartTabs(directions: BreakdownDirections): BreakdownChartTab[] {
  return hasBothBreakdownDirections(directions) ? BOTH_DIRECTIONS_TABS : SINGLE_DIRECTION_TABS
}

/** Koercja taba przy zmianie kierunku (B5). */
export function resolveBreakdownChartTab(
  tab: BreakdownChartTab | null,
  directions: BreakdownDirections,
): BreakdownChartTab {
  const fallback = defaultBreakdownChartTab(directions)
  const candidate = tab ?? fallback
  if (isBreakdownChartTabAvailable(candidate, directions)) {
    return candidate
  }
  return fallback
}

export function serializeBreakdownChartTab(
  tab: BreakdownChartTab,
  directions: BreakdownDirections,
  params: URLSearchParams,
): URLSearchParams {
  params.delete('breakdownChart')
  const defaultTab = defaultBreakdownChartTab(directions)
  if (tab !== defaultTab) {
    params.set('breakdownChart', tab)
  }
  return params
}

export function breakdownChartTabShowsLegend(tab: BreakdownChartTab): boolean {
  return tab === 'vertical' || tab === 'horizontal' || tab === 'donut'
}
