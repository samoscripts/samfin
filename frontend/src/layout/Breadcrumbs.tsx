import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'

const SEGMENT_LABELS: Record<string, string> = {
  transactions: 'Transactions',
  import:       'Import CSV',
  nowy:         'Nowy import',
  historia:     'Historia',
  bledy:        'Błędy',
  wiersze:      'Wiersze CSV',
  raporty:         'Raporty',
  default:         'Domyślne',
  monthly:         'Miesięczny',
  'common-account': 'Konto wspólne',
  settings:        'Ustawienia raportu',
  konfiguracja:    'Konfiguracja',
  podmioty:     'Podmioty',
  portfele:     'Portfele',
  dotyczy:      'Dotyczy',
  kategorie:    'Kategorie',
  ustawienia:   'Ustawienia',
  uzytkownicy:  'Użytkownicy',
  system:       'System',
  'moje-konto': 'Moje konto',
}

function resolveSegmentLabel(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  // Numeric segment inside /import/historia/:id → "Import #<id>"
  if (/^\d+$/.test(seg)) return `Import #${seg}`
  return seg
}

interface Crumb {
  label: string
  to: string
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: 'Dashboard', to: '/' }]
  segments.forEach((seg, idx) => {
    crumbs.push({
      label: resolveSegmentLabel(seg),
      to: '/' + segments.slice(0, idx + 1).join('/'),
    })
  })
  return crumbs
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const crumbs = buildCrumbs(pathname)
  const isRoot = pathname === '/'

  return (
    <div className="flex items-center gap-1.5 px-4 md:px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[40px]">
      <button
        onClick={() => navigate(-1)}
        disabled={isRoot}
        className={[
          'p-1 rounded transition-colors mr-0.5 shrink-0',
          isRoot
            ? 'text-gray-200 dark:text-gray-700 cursor-default'
            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
        title={isRoot ? undefined : 'Wróć'}
        aria-label="Wróć"
      >
        <ArrowLeft size={14} />
      </button>

      <nav className="flex items-center gap-0.5 text-xs min-w-0" aria-label="Breadcrumbs">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <span key={crumb.to} className="flex items-center gap-0.5 min-w-0">
              {idx > 0 && (
                <ChevronRight size={11} className="shrink-0 text-gray-300 dark:text-gray-600 mx-0.5" />
              )}
              {isLast ? (
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </div>
  )
}
