import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ArrowDown, ArrowUpDown, PanelRight, ArrowRight } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'
import StatusBadge from '@/shared/components/StatusBadge'
import Pagination from '@/shared/components/Pagination'
import FilterDrawer from '../components/FilterDrawer'
import FilterChips from '../components/FilterChips'
import { ItemAmounts, ItemField } from '../components/TransactionCells'
import { useFlowsQuery } from '../hooks/useFlowsQuery'
import { FlowFilters, SortState, PaginationState, countActiveFilters } from '../types'
import { ENTITY_LABELS, resolveLabel } from '../mockData'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import { Transaction } from '@/shared/types'
import { formatDate } from '@/shared/utils/format'

const INITIAL_SORT: SortState = { field: 'date', direction: 'desc' }
const INITIAL_PAGINATION: PaginationState = { page: 1, perPage: 25 }

type SortableCol = 'date' | 'amount'

const COLUMNS: { key: string; label: string; sortable?: SortableCol }[] = [
  { key: 'date', label: 'Data', sortable: 'date' },
  { key: 'direction', label: 'Typ' },
  { key: 'paidFrom', label: 'Skąd' },
  { key: 'paidTo', label: 'Dokąd' },
  { key: 'description', label: 'Opis' },
  { key: 'wallet', label: 'Portfel' },
  { key: 'concern', label: 'Dotyczy' },
  { key: 'category', label: 'Kategoria' },
  { key: 'amount', label: 'Kwota', sortable: 'amount' },
  { key: 'status', label: 'Status' },
]

export default function Operacje() {
  const [activeFilters, setActiveFilters] = useState<FlowFilters>({})
  const [sort, setSort] = useState<SortState>(INITIAL_SORT)
  const [pagination, setPagination] = useState<PaginationState>(INITIAL_PAGINATION)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(360)

  const portalRoot = useRightPanelPortal()

  const { data, isLoading, meta } = useFlowsQuery(activeFilters, sort, pagination)

  const handleApplyFilters = useCallback((filters: FlowFilters) => {
    setActiveFilters(filters)
    setPagination((p) => ({ ...p, page: 1 }))
  }, [])

  const handleSortColumn = (field: SortableCol) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' },
    )
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const activeCount = countActiveFilters(activeFilters)

  const filtryButton = (
    <button
      onClick={() => setPanelOpen((v) => !v)}
      className={[
        'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm',
        panelOpen
          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
      ].join(' ')}
      aria-label={panelOpen ? 'Schowaj filtry' : 'Pokaż filtry'}
    >
      <PanelRight size={15} />
      Filtry
      {activeCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
          style={{ backgroundColor: '#c9a96e' }}
        >
          {activeCount}
        </span>
      )}
    </button>
  )

  return (
    <>
      <div className="flex flex-col md:h-full md:overflow-hidden">
        <div className="px-4 md:px-6 pt-6 pb-0 shrink-0">
          <PageHeader
            title="Operacje"
            subtitle="Lista wszystkich operacji finansowych"
            actions={filtryButton}
          />
        </div>

        {activeCount > 0 && (
          <div className="px-4 md:px-6 pb-2 pt-3 shrink-0">
            <FilterChips filters={activeFilters} onChange={handleApplyFilters} />
          </div>
        )}

        {/* Mobile: card list */}
        <div className="md:hidden px-4 pb-6 pt-3">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Ładowanie…</div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wyników</p>
              {activeCount > 0 && (
                <button onClick={() => handleApplyFilters({})} className="mt-2 text-xs text-[#c9a96e] hover:underline">
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((tx) => <TransactionCard key={tx.transactionId} tx={tx} />)}
            </div>
          )}
          <div className="mt-4">
            <Pagination meta={meta} state={pagination} onChange={setPagination} />
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:flex flex-1 min-h-0 px-6 pb-6 pt-3">
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-gray-400 dark:text-gray-600">Ładowanie…</div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Brak wyników</p>
                {activeCount > 0 && (
                  <button onClick={() => handleApplyFilters({})} className="mt-2 text-xs text-[#c9a96e] hover:underline">
                    Wyczyść filtry
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          onClick={col.sortable ? () => handleSortColumn(col.sortable!) : undefined}
                          className={[
                            'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap',
                            col.sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : '',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && <SortIcon field={col.sortable} sort={sort} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {data.map((tx) => (
                      <tr
                        key={tx.transactionId}
                        className={[
                          'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-default',
                          tx.unassigned ? 'bg-amber-50/40 dark:bg-amber-950/20' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">{tx.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tx.direction === 'INCOME' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'].join(' ')}>
                            {tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{resolveLabel(ENTITY_LABELS, tx.paidFrom)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{resolveLabel(ENTITY_LABELS, tx.paidTo)}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[220px]"><span className="line-clamp-1">{tx.description}</span></td>
                        <td className="px-4 py-3"><ItemField items={tx.items} field="wallet" /></td>
                        <td className="px-4 py-3"><ItemField items={tx.items} field="concern" /></td>
                        <td className="px-4 py-3"><ItemField items={tx.items} field="category" /></td>
                        <td className="px-4 py-3 whitespace-nowrap"><ItemAmounts tx={tx} /></td>
                        <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination meta={meta} state={pagination} onChange={setPagination} />
          </div>
        </div>
      </div>

      {portalRoot && createPortal(
        <FilterDrawer
          open={panelOpen}
          width={panelWidth}
          onWidthChange={setPanelWidth}
          activeFilters={activeFilters}
          onApply={handleApplyFilters}
          onClose={() => setPanelOpen(false)}
        />,
        portalRoot,
      )}
    </>
  )
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={[
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4',
        tx.unassigned ? 'border-l-2 border-l-amber-400' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0 pt-0.5">
          {formatDate(tx.date)}
        </span>
        <ItemAmounts tx={tx} />
      </div>

      <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {tx.description}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate max-w-[120px]">{resolveLabel(ENTITY_LABELS, tx.paidFrom)}</span>
        <ArrowRight size={10} className="shrink-0" />
        <span className="truncate max-w-[120px]">{resolveLabel(ENTITY_LABELS, tx.paidTo)}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tx.direction === 'INCOME' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'].join(' ')}>
          {tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'}
        </span>
        <StatusBadge status={tx.status} />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {expanded ? 'Mniej' : 'Więcej'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <ItemField items={tx.items} field="wallet" />
          <ItemField items={tx.items} field="concern" />
          <ItemField items={tx.items} field="category" />
        </div>
      )}
    </div>
  )
}

function SortIcon({ field, sort }: { field: SortableCol; sort: SortState }) {
  if (sort.field !== field) return <ArrowUpDown size={10} className="text-gray-300 dark:text-gray-600" />
  return sort.direction === 'asc'
    ? <ArrowUp size={10} className="text-[#c9a96e]" />
    : <ArrowDown size={10} className="text-[#c9a96e]" />
}
