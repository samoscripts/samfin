import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CategoryPanel } from '../types/categoryPanel'
import {
  isCategoryPanelOpenFromUrl,
  parseCategoryPanelSearchParams,
  serializeCategoryPanelSearchParams,
} from '../utils/categoryPanelUrl'
import { searchParamsEqual } from '@/shared/utils/urlQuery'

export function useCategoriesPanelUrl() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlState = useMemo(
    () => parseCategoryPanelSearchParams(searchParams),
    [searchParams],
  )

  const applyUrl = useCallback(
    (patch: { panel?: CategoryPanel | null; categoryId?: number | null }, options?: { replace?: boolean }) => {
      const next = {
        panel: patch.panel !== undefined ? patch.panel : urlState.panel,
        categoryId: patch.categoryId !== undefined ? patch.categoryId : urlState.categoryId,
      }
      if (!next.panel) {
        next.categoryId = null
      }
      if (next.panel === 'create') {
        next.categoryId = null
      }
      const serialized = serializeCategoryPanelSearchParams(next)
      if (searchParamsEqual(searchParams, serialized)) return
      setSearchParams(serialized, { replace: options?.replace ?? true })
    },
    [searchParams, setSearchParams, urlState],
  )

  const openPanel = useCallback(
    (panel: CategoryPanel, categoryId?: number) => {
      applyUrl({ panel, categoryId: categoryId ?? null })
    },
    [applyUrl],
  )

  const closePanel = useCallback(() => {
    applyUrl({ panel: null, categoryId: null })
  }, [applyUrl])

  return {
    panel: urlState.panel,
    categoryId: urlState.categoryId,
    panelOpen: isCategoryPanelOpenFromUrl(urlState),
    openPanel,
    closePanel,
  }
}
