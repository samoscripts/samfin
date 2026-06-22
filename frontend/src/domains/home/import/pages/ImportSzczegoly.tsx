import { useEffect, useState } from 'react'

import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'

import { ArrowRight, Loader2, RefreshCw, Trash2 } from 'lucide-react'

import ConfirmDialog from '@/shared/components/ConfirmDialog'

import Pill from '@/shared/components/Pill'

import FormError from '@/shared/components/form/FormError'

import { IMPORT_STATUS_PILL } from '@/shared/constants/pillMaps'

import {

  fetchImport,

  triggerImport,

  deleteImport,

  type CsvImportResult,

  type ImportIngestionMode,

} from '@/shared/api/csvImports'

import type { ImportErrorContext } from '@/shared/utils/errors'

import { isClassificationRuleErrorContext, isDuplicateImportRowContext, parseApiError } from '@/shared/utils/errors'

import ImportRuleErrorDetails from '../components/ImportRuleErrorDetails'

import ImportDuplicateRowErrorDetails from '../components/ImportDuplicateRowErrorDetails'



const STATUS_LABEL: Record<string, string> = {

  PENDING:   'W trakcie',

  VALIDATED: 'Zwalidowany',

  FAILED:    'Błąd',

  IMPORTED:  'Zaimportowany',

}



const SUBTABS = [

  { to: 'bledy',   label: 'Błędy' },

  { to: 'wiersze', label: 'Wiersze CSV' },

]



export default function ImportSzczegoly() {

  const { id } = useParams<{ id: string }>()

  const navigate  = useNavigate()

  const [imp, setImp]         = useState<CsvImportResult | null>(null)
  const [loading, setLoading]  = useState(true)

  const [error, setError]      = useState<string | null>(null)

  const [importing, setImporting]       = useState(false)

  const [importError, setImportError]   = useState<string | null>(null)

  const [importErrorContext, setImportErrorContext] = useState<ImportErrorContext | null>(null)

  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const [reimportConfirm, setReimportConfirm] = useState(false)

  const [deleting, setDeleting]         = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [deleteError, setDeleteError]   = useState<string | null>(null)



  useEffect(() => {
    if (!id) return

    setLoading(true)
    fetchImport(parseInt(id))
      .then(setImp)
      .catch(() => setError('Nie udało się załadować danych importu.'))
      .finally(() => setLoading(false))
  }, [id])



  async function handleImport(mode: ImportIngestionMode) {

    if (!imp) return

    setImporting(true)

    setImportError(null)

    setImportErrorContext(null)

    setImportSuccess(null)

    setReimportConfirm(false)

    try {

      const { import: updated, stats } = await triggerImport(imp.id, mode)

      setImp(updated)

      const parts: string[] = []

      if (stats.imported > 0) parts.push(`zaimportowano ${stats.imported}`)

      if (stats.skipped > 0) parts.push(`pominięto ${stats.skipped}`)

      if (stats.duplicates > 0) parts.push(`duplikaty ${stats.duplicates}`)

      setImportSuccess(

        parts.length > 0

          ? `Import zakończony: ${parts.join(', ')}.`

          : 'Brak wierszy do przetworzenia.',

      )

    } catch (err) {

      const { message, context } = parseApiError(err, 'Nie udało się przenieść danych do transakcji.')

      setImportError(message)

      setImportErrorContext(context ?? null)

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



  const canTransfer = imp.status === 'VALIDATED' || imp.status === 'IMPORTED'

  const canDelete = imp.status !== 'IMPORTED'



  return (

    <div>

      <ConfirmDialog

        open={reimportConfirm}

        title="Importuj od nowa?"

        message="Usunie istniejące transakcje powiązane z wierszami tego importu i utworzy je ponownie (z aktualnymi regułami klasyfikacji). Tej operacji nie można cofnąć."

        confirmLabel="Importuj od nowa"

        loading={importing}

        onConfirm={() => handleImport('reimport')}

        onCancel={() => setReimportConfirm(false)}

      />



      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">

        <div className="flex items-start justify-between gap-4 flex-wrap">

          <div>

            <div className="flex items-center gap-2 flex-wrap">

              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">

                Import #{imp.id} — {imp.source}

              </h2>

              <Pill variant={IMPORT_STATUS_PILL[imp.status] ?? 'neutral'}>

                {STATUS_LABEL[imp.status] ?? imp.status}

              </Pill>

            </div>

            {imp.originalFilename && (

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{imp.originalFilename}</p>

            )}

          </div>



          <div className="flex flex-col items-end gap-2">

            {canTransfer && (

              <>

                <div className="flex flex-wrap items-center justify-end gap-2">

                  <button

                    type="button"

                    onClick={() => handleImport('skip_imported')}

                    disabled={importing}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a472a] hover:bg-[#15391f] text-white text-xs font-medium transition-colors disabled:opacity-60"

                  >

                    {importing

                      ? <Loader2 size={13} className="animate-spin" />

                      : <ArrowRight size={13} />

                    }

                    Przenieś nowe wiersze

                  </button>

                  <button

                    type="button"

                    onClick={() => setReimportConfirm(true)}

                    disabled={importing}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a472a] text-[#1a472a] dark:text-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-medium transition-colors disabled:opacity-60"

                  >

                    <RefreshCw size={13} />

                    Importuj od nowa

                  </button>

                </div>

                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right max-w-md">

                  „Nowe wiersze” pomija już zaimportowane. „Od nowa” usuwa istniejące transakcje z tego importu i tworzy je ponownie.

                </p>

              </>

            )}



            {importSuccess && (

              <p className="text-xs text-emerald-700 dark:text-emerald-400 text-right">{importSuccess}</p>

            )}



            {(importError || importErrorContext) && (

              <div className="flex flex-col items-end gap-2 max-w-2xl w-full">

                {importError && (

                  <FormError message={importError} className="text-xs px-3 py-2 mb-0 w-full whitespace-pre-wrap" />

                )}

                {importErrorContext && isClassificationRuleErrorContext(importErrorContext) && (

                  <ImportRuleErrorDetails context={importErrorContext} className="w-full" />

                )}

                {importErrorContext && isDuplicateImportRowContext(importErrorContext) && (

                  <div className="flex flex-col items-end gap-2 w-full">

                    <ImportDuplicateRowErrorDetails context={importErrorContext} className="w-full" />

                    <div className="flex flex-wrap gap-2 justify-end">

                      <button

                        type="button"

                        onClick={() => handleImport('skip_imported')}

                        disabled={importing}

                        className="px-3 py-1.5 rounded-lg bg-[#1a472a] hover:bg-[#15391f] text-white text-xs font-medium disabled:opacity-60"

                      >

                        Pomiń zaimportowane i kontynuuj

                      </button>

                      <button

                        type="button"

                        onClick={() => setReimportConfirm(true)}

                        disabled={importing}

                        className="px-3 py-1.5 rounded-lg border border-[#1a472a] text-[#1a472a] dark:text-emerald-300 dark:border-emerald-700 text-xs font-medium disabled:opacity-60"

                      >

                        Importuj od nowa

                      </button>

                    </div>

                  </div>

                )}

              </div>

            )}



            {canDelete && (

              <>

                {!deleteConfirm ? (

                  <button

                    type="button"

                    onClick={() => setDeleteConfirm(true)}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors"

                  >

                    <Trash2 size={13} />

                    Usuń import

                  </button>

                ) : (

                  <div className="flex items-center gap-2">

                    <button

                      type="button"

                      onClick={handleDelete}

                      disabled={deleting}

                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-60"

                    >

                      {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}

                      Potwierdź usunięcie

                    </button>

                    <button

                      type="button"

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

              </>

            )}

          </div>

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

          <Stat label="Utworzono" value={new Date(imp.createdAt).toLocaleString('pl-PL')} />

        </div>

      </div>



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


