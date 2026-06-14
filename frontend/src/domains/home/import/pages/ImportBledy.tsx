import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Pill from '@/shared/components/Pill'
import { IMPORT_ERROR_SCOPE_PILL } from '@/shared/constants/pillMaps'
import { fetchImportErrors, type CsvImportError } from '@/shared/api/csvImports'

const SCOPE_LABEL: Record<string, string> = {
  HEADER: 'Nagłówek',
  ROW: 'Wiersz',
}

export default function ImportBledy() {
  const { id } = useParams<{ id: string }>()
  const importId = parseInt(id ?? '0')

  const [items, setItems]     = useState<CsvImportError[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 50

  async function load(p = 1) {
    setLoading(true)
    try {
      const resp = await fetchImportErrors(importId, { page: p, limit })
      setItems(resp.items)
      setTotal(resp.total)
      setPages(resp.pages)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [importId])

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Brak błędów — import przebiegł bez problemów.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{total} błędów</p>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Zakres</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">Linia</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-48">Kod</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Komunikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {items.map((err) => (
                <tr key={err.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <Pill variant={IMPORT_ERROR_SCOPE_PILL[err.scope] ?? 'neutral'}>
                      {SCOPE_LABEL[err.scope] ?? err.scope}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {err.lineNo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                    {err.code}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {err.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((err) => (
            <div key={err.id} className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Pill variant={IMPORT_ERROR_SCOPE_PILL[err.scope] ?? 'neutral'}>
                  {SCOPE_LABEL[err.scope] ?? err.scope}
                </Pill>
                {err.lineNo && (
                  <span className="text-xs text-gray-400">linia {err.lineNo}</span>
                )}
                <span className="text-xs font-mono text-gray-500">{err.code}</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">{err.message}</p>
            </div>
          ))}
        </div>
      </div>

      <SimplePagination page={page} pages={pages} loading={loading} onPage={load} />
    </div>
  )
}

function SimplePagination({
  page, pages, loading, onPage,
}: {
  page: number; pages: number; loading: boolean; onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1 || loading}
        className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Poprzednia
      </button>
      <span className="text-xs text-gray-500 dark:text-gray-400">{page} / {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages || loading}
        className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Następna
      </button>
    </div>
  )
}
