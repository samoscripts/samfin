import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { fetchImports, type CsvImportResult } from '@/shared/api/csvImports'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ImportHistoria() {
  const navigate = useNavigate()

  const [items, setItems]     = useState<CsvImportResult[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)

  const limit = 20

  async function load(p = 1) {
    setLoading(true)
    try {
      const resp = await fetchImports({ page: p, limit })
      setItems(resp.items)
      setTotal(resp.total)
      setPages(resp.pages)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  function openDetail(imp: CsvImportResult) {
    navigate(String(imp.id), { state: { imp } })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historia importów</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} {total === 1 ? 'rekord' : 'rekordów'}
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          title="Odśwież"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Brak importów. Skorzystaj z zakładki „Nowy import".
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Data</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Bank</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Plik</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Rachunek</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Wiersze</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((imp) => (
                  <tr
                    key={imp.id}
                    onClick={() => openDetail(imp)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(imp.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">
                      {imp.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
                      {imp.originalFilename ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                      {imp.detectedAccountDisplay ?? imp.detectedAccountNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[imp.status] ?? ''}`}>
                        {STATUS_LABEL[imp.status] ?? imp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {imp.rowsParsed}/{imp.rowsTotal}
                      {imp.rowsInvalid > 0 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">
                          ({imp.rowsInvalid} błędnych)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={14} className="text-gray-400 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {items.map((imp) => (
              <div
                key={imp.id}
                onClick={() => openDetail(imp)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-[#c9a96e]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {imp.source}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[imp.status] ?? ''}`}>
                        {STATUS_LABEL[imp.status] ?? imp.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {imp.originalFilename ?? '—'}
                    </p>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                      {imp.detectedAccountDisplay ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(imp.createdAt)} · {imp.rowsParsed}/{imp.rowsTotal} wierszy
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Poprzednia
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{page} / {pages}</span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pages || loading}
                className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Następna
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
