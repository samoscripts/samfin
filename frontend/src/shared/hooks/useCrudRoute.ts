import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

export interface CrudRouteState {
  isList: boolean
  isCreate: boolean
  isEdit: boolean
  entityId: number | null
  goList: () => void
  goCreate: () => void
  goEdit: (id: number) => void
}

/** URL-driven list/create/edit under a fixed base path (ADR-020, ADR-025). */
export function useCrudRoute(basePath: string): CrudRouteState {
  const navigate = useNavigate()
  const location = useLocation()
  const { entityId: entityIdParam } = useParams<{ entityId?: string }>()

  const normalizedBase = basePath.replace(/\/$/, '')

  const isCreate = location.pathname === `${normalizedBase}/nowy`
  const isEdit = Boolean(entityIdParam) && location.pathname === `${normalizedBase}/${entityIdParam}/edycja`
  const isList = !isCreate && !isEdit

  const entityId = useMemo(() => {
    if (!entityIdParam) return null
    const id = Number.parseInt(entityIdParam, 10)
    return Number.isFinite(id) ? id : null
  }, [entityIdParam])

  const goList = useCallback(() => navigate(normalizedBase), [navigate, normalizedBase])
  const goCreate = useCallback(() => navigate(`${normalizedBase}/nowy`), [navigate, normalizedBase])
  const goEdit = useCallback(
    (id: number) => navigate(`${normalizedBase}/${id}/edycja`),
    [navigate, normalizedBase],
  )

  return { isList, isCreate, isEdit, entityId, goList, goCreate, goEdit }
}
