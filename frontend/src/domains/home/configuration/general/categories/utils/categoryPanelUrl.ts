import { buildSearchParams, parsePositiveInt } from '@/shared/utils/urlQuery'
import type { CategoryPanel, CategoryPanelUrlState } from '../types/categoryPanel'

const VALID_PANELS: CategoryPanel[] = ['create', 'edit', 'move', 'merge']

function parsePanel(raw: string | null): CategoryPanel | null {
  if (!raw) return null
  return VALID_PANELS.includes(raw as CategoryPanel) ? (raw as CategoryPanel) : null
}

export function parseCategoryPanelSearchParams(params: URLSearchParams): CategoryPanelUrlState {
  const panel = parsePanel(params.get('panel'))
  const categoryId = parsePositiveInt(params.get('id')) ?? null

  if (panel === 'create') {
    return { panel: 'create', categoryId: null }
  }

  if (panel && categoryId === null) {
    return { panel: null, categoryId: null }
  }

  if (panel && categoryId !== null) {
    return { panel, categoryId }
  }

  return { panel: null, categoryId: null }
}

export function serializeCategoryPanelSearchParams(state: CategoryPanelUrlState): URLSearchParams {
  if (!state.panel) {
    return new URLSearchParams()
  }

  if (state.panel === 'create') {
    return buildSearchParams({ panel: 'create' })
  }

  return buildSearchParams({
    panel: state.panel,
    id: state.categoryId ?? undefined,
  })
}

export function isCategoryPanelOpenFromUrl(state: CategoryPanelUrlState): boolean {
  return state.panel !== null
}
