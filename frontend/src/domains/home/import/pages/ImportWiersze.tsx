import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ListTextTooltip from '@/shared/components/ListTextTooltip'
import { fetchImportRows, type CsvImportRow } from '@/shared/api/csvImports'
import { buildSearchParams, parseOptionalString, parsePositiveInt } from '@/shared/utils/urlQuery'

type ParseFilter = 'ALL' | 'VALIDATED' | 'IMPORTED' | 'DUPLICATE' | 'PARSE_ERROR'

const VALID_FILTERS = new Set<ParseFilter>(['ALL', 'VALIDATED', 'IMPORTED', 'DUPLICATE', 'PARSE_ERROR'])

const ROW_STATUS_LABEL: Record<string, string> = {
  VALIDATED:   'Zwalidowany',
  IMPORTED:    'Zaimportowany',
  DUPLICATE:   'Zduplikowany',
  PARSE_ERROR: 'Błąd parsowania',
}

const ROW_STATUS_CLS: Record<string, string> = {
  VALIDATED:   'text-amber-600 dark:text-amber-400',
  IMPORTED:    'text-emerald-600 dark:text-emerald-400',
  DUPLICATE:   'text-gray-500 dark:text-gray-400',
  PARSE_ERROR: 'text-red-600 dark:text-red-400',
}

const FILTER_LABELS: Record<ParseFilter, string> = {
  ALL:         'Wszystkie',
  VALIDATED:   'Zwalidowane',
  IMPORTED:    'Zaimportowane',
  DUPLICATE:   'Zduplikowane',
  PARSE_ERROR: 'Błędy',
}

function formatAmount(minor: number | null): string {
  if (minor === null) return '—'
  const sign   = minor < 0 ? '-' : '+'
  const abs    = Math.abs(minor)
  const zloty  = Math.floor(abs / 100)
  const grosze = String(abs % 100).padStart(2, '0')
  return `${sign}${zloty},${grosze} PLN`
}

function rowTitle(row: CsvImportRow): string | null {
  return row.titleClean ?? row.descriptionRaw
}

export default function ImportWiersze() {
  const { id } = useParams<{ id: string }>()
  const importId = parseInt(id ?? '0')
  const [searchParams, setSearchParams] = useSearchParams()

  const page = useMemo(
    () => parsePositiveInt(searchParams.get('page')) ?? 1,
    [searchParams],
  )

  const filter = useMemo((): ParseFilter => {
    const raw = parseOptionalString(searchParams.get('parseStatus'))
    return raw && VALID_FILTERS.has(raw as ParseFilter) ? (raw as ParseFilter) : 'ALL'
  }, [searchParams])

  const [items, setItems]         = useState<CsvImportRow[]>([])
  const [total, setTotal]         = useState(0)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(true)
  const perPage = 100

  const updateQuery = useCallback(
    (patch: { page?: number; parseStatus?: ParseFilter }) => {
      const nextPage = patch.page ?? page
      const nextFilter = patch.parseStatus ?? filter
      const params = buildSearchParams({
        page: nextPage > 1 ? nextPage : undefined,
        parseStatus: nextFilter !== 'ALL' ? nextFilter : undefined,
      })
      setSearchParams(params, { replace: true })
    },
    [page, filter, setSearchParams],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchImportRows(importId, {
      page,
      perPage,
      parseStatus: filter === 'ALL' ? undefined : filter,
    })
      .then((resp) => {
        if (cancelled) return
        setItems(resp.data)
        setTotal(resp.meta.total)
        setPages(resp.meta.lastPage)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [importId, page, filter])

  function handleFilter(f: ParseFilter) {
    updateQuery({ page: 1, parseStatus: f })
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{total} wierszy</p>
        <div className="flex items-center gap-1 ml-auto">
          {(['ALL', 'VALIDATED', 'IMPORTED', 'DUPLICATE', 'PARSE_ERROR'] as ParseFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={[
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-[#1a472a] text-white'
                  : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Brak wierszy spełniających kryteria.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-12">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-24">Data</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400">Tytuł / opis</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-40">Typ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-36">Kontrahent</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-44">NRB</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-500 dark:text-gray-400 w-36">Kwota</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-500 dark:text-gray-400 w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className={[
                      'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                      row.parseStatus === 'PARSE_ERROR' ? 'bg-red-50/40 dark:bg-red-950/20' : '',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2.5 text-gray-400">{row.lineNo}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {row.operationDate ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-sm">
                      <ListTextTooltip text={rowTitle(row)} />
                      {row.parseStatus === 'PARSE_ERROR' && row.parseError && (
                        <p className="text-red-600 dark:text-red-400 mt-0.5 text-xs">
                          {row.parseError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 max-w-[160px] truncate" title={row.operationTypeRaw ?? ''}>
                      {row.operationTypeRaw ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 max-w-[140px] truncate" title={row.counterpartyNameRaw ?? ''}>
                      {row.counterpartyNameRaw ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 max-w-[180px] truncate font-mono text-[11px]" title={row.counterpartyAccountRaw ?? ''}>
                      {row.counterpartyAccountRaw ?? '—'}
                    </td>
                    <td className={[
                      'px-3 py-2.5 text-right font-mono whitespace-nowrap',
                      row.amountMinor !== null && row.amountMinor < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                    ].join(' ')}>
                      {formatAmount(row.amountMinor)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={ROW_STATUS_CLS[row.parseStatus] ?? 'text-gray-500'}>
                        {ROW_STATUS_LABEL[row.parseStatus] ?? row.parseStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/tablet cards */}
          <div className="lg:hidden divide-y divide-gray-50 dark:divide-gray-800/60">
            {items.map((row) => (
              <div
                key={row.id}
                className={['p-4', row.parseStatus === 'PARSE_ERROR' ? 'bg-red-50/40 dark:bg-red-950/20' : ''].join(' ')}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs text-gray-400">
                    #{row.lineNo} · {row.operationDate ?? '—'}
                  </span>
                  <span className={`text-xs ${ROW_STATUS_CLS[row.parseStatus] ?? 'text-gray-500'}`}>
                    {ROW_STATUS_LABEL[row.parseStatus] ?? row.parseStatus}
                  </span></div>
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  <ListTextTooltip text={rowTitle(row)} lines={2} />
                  {row.operationTypeRaw && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{row.operationTypeRaw}</p>
                  )}
                </div>
                {(row.counterpartyNameRaw || row.counterpartyAccountRaw) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {row.counterpartyNameRaw && (
                      <span title={row.counterpartyNameRaw}>{row.counterpartyNameRaw}</span>
                    )}
                    {row.counterpartyNameRaw && row.counterpartyAccountRaw && (
                      <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                    )}
                    {row.counterpartyAccountRaw && (
                      <span className="font-mono" title={row.counterpartyAccountRaw}>{row.counterpartyAccountRaw}</span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className={[
                    'text-sm font-mono font-semibold',
                    row.amountMinor !== null && row.amountMinor < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  ].join(' ')}>
                    {formatAmount(row.amountMinor)}
                  </span>
                </div>
                {row.parseStatus === 'PARSE_ERROR' && row.parseError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{row.parseError}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SimplePagination page={page} pages={pages} loading={loading} onPage={(p) => updateQuery({ page: p })} />
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
