import { Navigate, useParams } from 'react-router-dom'

/** Redirects legacy /kategorie/nowy and /kategorie/:id/edycja to query-param panel URLs. */
export function CategoriesCreateRedirect() {
  return <Navigate to="/konfiguracja/kategorie?panel=create" replace />
}

export function CategoriesEditRedirect() {
  const { entityId } = useParams<{ entityId: string }>()
  const id = entityId ? Number.parseInt(entityId, 10) : NaN
  if (!Number.isFinite(id)) {
    return <Navigate to="/konfiguracja/kategorie" replace />
  }
  return <Navigate to={`/konfiguracja/kategorie?panel=edit&id=${id}`} replace />
}
