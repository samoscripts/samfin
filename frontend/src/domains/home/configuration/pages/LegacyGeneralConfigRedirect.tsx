import { Navigate, useLocation } from 'react-router-dom'

const LEGACY_SECTIONS = ['podmioty', 'portfele', 'dotyczy', 'kategorie'] as const

type LegacySection = (typeof LEGACY_SECTIONS)[number]

function isLegacySection(value: string): value is LegacySection {
  return (LEGACY_SECTIONS as readonly string[]).includes(value)
}

/** Przekierowanie /konfiguracja/{section}/* → /konfiguracja/ogolne/{section}/* */
export function LegacyGeneralConfigRedirect() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const sectionIndex = segments.indexOf('konfiguracja') + 1
  const section = segments[sectionIndex]

  if (!isLegacySection(section)) {
    return <Navigate to="/konfiguracja/ogolne/podmioty" replace />
  }

  const rest = segments.slice(sectionIndex + 1).join('/')
  const target = rest
    ? `/konfiguracja/ogolne/${section}/${rest}`
    : `/konfiguracja/ogolne/${section}`

  return <Navigate to={target} replace />
}
