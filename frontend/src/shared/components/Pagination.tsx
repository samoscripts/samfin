import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PaginationMeta, PaginationState } from '@/domains/home/transactions/types'

const PER_PAGE_OPTIONS = [25, 50, 100]

interface PaginationProps {
  meta: PaginationMeta
  state: PaginationState
  onChange: (next: PaginationState) => void
}

export default function Pagination({ meta, state, onChange }: PaginationProps) {
  const { total, page, perPage, lastPage } = meta

  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const goTo = (p: number) => onChange({ ...state, page: p })
  const setPerPage = (n: number) => onChange({ page: 1, perPage: n })

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {total === 0 ? 'Brak wyników' : `${from}–${to} z ${total}`}
        </span>
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          className="text-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 px-1.5 py-1 focus:outline-none"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / str.</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <NavBtn onClick={() => goTo(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} />
        </NavBtn>

        {buildPages(page, lastPage).map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-gray-400 dark:text-gray-600 select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p as number)}
              className={[
                'min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors',
                p === page
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              ].join(' ')}
              style={p === page ? { backgroundColor: '#1c4230' } : undefined}
            >
              {p}
            </button>
          ),
        )}

        <NavBtn onClick={() => goTo(page + 1)} disabled={page >= lastPage}>
          <ChevronRight size={14} />
        </NavBtn>
      </div>
    </div>
  )
}

function NavBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function buildPages(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n) }

  add(1)
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) add(p)
  if (current < last - 2) pages.push('...')
  add(last)

  return pages
}
