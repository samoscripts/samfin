import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, Upload, XCircle } from 'lucide-react'
import {
  fetchProviders,
  uploadCsv,
  type BankProvider,
  type CsvImportResult,
} from '@/shared/api/csvImports'
import { getApiErrorMessage } from '@/shared/utils/errors'

const selectCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] transition-colors'

export default function ImportNowy() {
  const navigate = useNavigate()

  const [providers, setProviders]     = useState<BankProvider[]>([])
  const [source, setSource]           = useState<string>('')
  const [file, setFile]               = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [result, setResult]           = useState<CsvImportResult | null>(null)
  const [errors, setErrors]           = useState<string[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProviders().then((list) => {
      setProviders(list)
      if (list.length > 0) setSource(list[0].code)
    })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setErrors([])
    setGlobalError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !source) return
    setUploading(true)
    setResult(null)
    setErrors([])
    setGlobalError(null)
    try {
      const resp = await uploadCsv(source, file)
      // #region agent log
      fetch('http://127.0.0.1:7837/ingest/efae5210-b6ce-4fa0-9427-6c2f8db109a0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca6b48'},body:JSON.stringify({sessionId:'ca6b48',location:'ImportNowy.tsx:handleSubmit',message:'upload completed',data:{importId:resp.import.id,status:resp.import.status,partyId:resp.import.partyId,rowsTotal:resp.import.rowsTotal,rowsParsed:resp.import.rowsParsed},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      setResult(resp.import)
      setErrors(resp.errors)
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { import?: CsvImportResult; errors?: string[]; message?: string } }
      }
      if (apiErr?.response?.data?.import) {
        setResult(apiErr.response.data.import)
        setErrors(apiErr.response.data.errors ?? [])
      } else {
        setGlobalError(getApiErrorMessage(err, 'Wystąpił nieoczekiwany błąd podczas importu.'))
      }
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    setErrors([])
    setGlobalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isSuccess = result?.status === 'VALIDATED' || result?.status === 'IMPORTED'

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Zaimportuj historię transakcji z pliku CSV eksportowanego z banku.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Bank *
          </label>
          <select
            className={selectCls}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={providers.length === 0 || uploading}
            required
          >
            {providers.map((p) => (
              <option key={p.code} value={p.code}>{p.displayName}</option>
            ))}
            {providers.length === 0 && <option value="">Ładowanie…</option>}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Plik CSV *
          </label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              id="csv-file-input"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label
              htmlFor="csv-file-input"
              className={[
                'flex items-center gap-3 w-full rounded-lg border px-4 py-3 cursor-pointer transition-colors text-sm',
                uploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-[#c9a96e] hover:bg-amber-50/30 dark:hover:bg-amber-950/10',
                file
                  ? 'border-[#c9a96e] bg-amber-50/20 dark:bg-amber-950/10 text-gray-800 dark:text-gray-200'
                  : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500',
              ].join(' ')}
            >
              <Upload size={16} className="shrink-0" />
              <span className="truncate">{file ? file.name : 'Kliknij, aby wybrać plik CSV…'}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || !source || uploading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {uploading
              ? <><Loader2 size={15} className="animate-spin" /> Importowanie…</>
              : <><Upload size={15} /> Importuj</>
            }
          </button>
          {result && (
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Wyczyść
            </button>
          )}
        </div>
      </form>

      {globalError && (
        <div className="mt-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{globalError}</p>
        </div>
      )}

      {result && (
        <div
          className={[
            'mt-6 rounded-xl border p-5 space-y-4',
            isSuccess
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30',
          ].join(' ')}
        >
          <div className="flex items-start gap-3">
            {isSuccess
              ? <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              : <XCircle    size={20} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            }
            <div>
              <p className={[
                'text-sm font-semibold',
                isSuccess
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300',
              ].join(' ')}>
                {isSuccess ? 'Plik zweryfikowany pomyślnie' : 'Import zakończony błędem'}
              </p>
              {result.originalFilename && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {result.originalFilename}
                </p>
              )}
            </div>
          </div>

          {isSuccess && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Rachunek" value={result.detectedAccountDisplay ?? result.detectedAccountNumber ?? '—'} />
              <Stat label="Klient"   value={result.detectedClientName ?? '—'} />
              <Stat label="Podmiot"  value={result.partyName ?? '—'} />
              <Stat label="Okres od" value={result.periodFrom ?? '—'} />
              <Stat label="Okres do" value={result.periodTo ?? '—'} />
              <Stat label="Wierszy"  value={`${result.rowsParsed} / ${result.rowsTotal}`} />
              {result.rowsInvalid > 0 && (
                <Stat label="Błędnych wierszy" value={String(result.rowsInvalid)} warn />
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Błędy</p>
              {errors.map((msg, idx) => (
                <div key={idx} className="text-xs text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-900/30 rounded-lg px-3 py-2">
                  {msg}
                </div>
              ))}
            </div>
          )}

          {isSuccess && result.rowsInvalid > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {result.rowsInvalid}{' '}
              {result.rowsInvalid === 1 ? 'wiersz zawiera błąd' : 'wierszy zawiera błędy'} i zostanie pominięty przy klasyfikacji.
            </p>
          )}

          {isSuccess && (
            <button
              type="button"
              onClick={() => navigate(`/import/historia/${result.id}`)}
              className="text-xs text-[#c9a96e] hover:underline"
            >
              Przejdź do szczegółów importu →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={[
        'text-sm font-medium truncate',
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200',
      ].join(' ')}>
        {value}
      </p>
    </div>
  )
}
