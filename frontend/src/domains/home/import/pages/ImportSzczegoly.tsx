import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from 'lucide-react'
import { fetchImport, triggerImport, deleteImport, type CsvImportResult } from '@/shared/api/csvImports'

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'W trakcie',
  VALIDATED: 'Zwalidowany',
  FAILED:    'Błąd',
  IMPORTED:  'Zaimportowany',
}

const STATUS_CLS: Record<string, string> = {
  PENDING:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  VALIDATED: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  FAILED:    'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  IMPORTED:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

const SUBTABS = [
  { to: 'bledy',   label: 'Błędy' },
  { to: 'wiersze', label: 'Wiersze CSV' },
]

export default function ImportSzczegoly() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Use import data passed from list (location.state) to avoid re-fetch;
  // fall back to API call if navigated directly.
  const stateImp = (location.state as { imp?: CsvImportResult } | null)?.imp

  const [imp, setImp]         = useState<CsvImportResult | null>(stateImp ?? null)
  const [loading, setLoading]  = useState(!stateImp)
  const [error, setError]      = useState<string | null>(null)
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  useEffect(() => {
    if (stateImp || !id) return
    setLoading(true)
    fetchImport(parseInt(id))
      .then(setImp)
      .catch(() => setError('Nie udało się załadować danych importu.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleImport() {
    if (!imp) return
    setImporting(true)
    setImportError(null)
    try {
      const updated = await triggerImport(imp.id)
      setImp(updated)
    } catch {
      setImportError('Nie udało się przenieść danych do transakcji.')
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete() {
    if (!imp) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteImport(imp.id)
      navigate('/import/historia')
    } catch {
      setDeleteError('Nie udało się usunąć importu.')
      setDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  if (error || !imp) {
    return (
      <div className="py-16 text-center text-sm text-red-500">
        {error ?? 'Nie znaleziono importu.'}
        <br />
        <button
          onClick={() => navigate('/import/historia')}
          className="mt-3 text-xs text-[#c9a96e] hover:underline"
        >
          Wróć do historii
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Mini breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-5">
        <button
          onClick={() => navigate('/import/historia')}
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={11} />
          Historia importów
        </button>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-400 font-medium">Import #{imp.id}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Import #{imp.id} — {imp.source}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[imp.status] ?? ''}`}>
                {STATUS_LABEL[imp.status] ?? imp.status}
              </span>
            </div>
            {imp.originalFilename && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{imp.originalFilename}</p>
            )}
          </div>
          {imp.status !== 'IMPORTED' && (
            <div className="flex flex-col items-end gap-1">
              {imp.status === 'VALIDATED' && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a472a] hover:bg-[#15391f] text-white text-xs font-medium transition-colors disabled:opacity-60"
                >
                  {importing
                    ? <Loader2 size={13} className="animate-spin" />
                    : <ArrowRight size={13} />
                  }
                  Przenieś do transakcji
                </button>
              )}
              {importError && (
                <p className="text-xs text-red-500 dark:text-red-400">{importError}</p>
              )}
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors"
                >
                  <Trash2 size={13} />
                  Usuń import
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Potwierdź usunięcie
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              )}
              {deleteError && (
                <p className="text-xs text-red-500 dark:text-red-400">{deleteError}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <Stat label="Rachunek"    value={imp.detectedAccountDisplay ?? imp.detectedAccountNumber ?? '—'} mono />
          <Stat label="Klient"      value={imp.detectedClientName ?? '—'} />
          <Stat label="Podmiot"     value={imp.partyName ?? '—'} />
          <Stat label="Okres"       value={imp.periodFrom && imp.periodTo ? `${imp.periodFrom} – ${imp.periodTo}` : '—'} />
          <Stat label="Wierszy"     value={`${imp.rowsParsed} / ${imp.rowsTotal}`} />
          {imp.rowsInvalid > 0 && (
            <Stat label="Błędnych"  value={String(imp.rowsInvalid)} warn />
          )}
          <Stat label="Zaimportowano" value={new Date(imp.createdAt).toLocaleString('pl-PL')} />
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <nav className="-mb-px flex gap-0">
          {SUBTABS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#c9a96e] text-[#c9a96e]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Active sub-tab content */}
      <Outlet />
    </div>
  )
}

function Stat({
  label,
  value,
  warn,
  mono,
}: {
  label: string
  value: string
  warn?: boolean
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={[
        'text-sm font-medium truncate mt-0.5',
        mono ? 'font-mono' : '',
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200',
      ].join(' ')}>
        {value}
      </p>
    </div>
  )
}
