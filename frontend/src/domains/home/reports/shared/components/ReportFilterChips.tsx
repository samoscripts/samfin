import { X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import { formatCategoryLabel } from '@/shared/utils/categoryOptions'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { isFilterValueActive } from '@/domains/home/transactions/types'

const KEY_LABELS: Partial<Record<keyof FlowFilters, string>> = {
  paidFromPartyId: 'Skąd',
  paidToPartyId: 'Dokąd',
  walletId: 'Portfel',
  concernId: 'Dotyczy',
  categoryId: 'Kategoria',
  amountMin: 'Kwota od',
  amountMax: 'Kwota do',
  description: 'Opis',
}

const REPORT_FILTER_KEYS = Object.keys(KEY_LABELS) as (keyof FlowFilters)[]

function resolveValue(
  key: keyof FlowFilters,
  value: FlowFilters[keyof FlowFilters],
  categories: Category[],
): string {
  switch (key) {
    case 'amountMin':
    case 'amountMax':
      return `${value} zł`
    case 'categoryId': {
      const cat = categories.find((c) => String(c.id) === value)
      return cat ? formatCategoryLabel(cat) : String(value)
    }
    default:
      return String(value)
  }
}

interface ReportFilterChipsProps {
  filters: FlowFilters
  categories: Category[]
  onChange: (filters: FlowFilters) => void
}

export default function ReportFilterChips({ filters, categories, onChange }: ReportFilterChipsProps) {
  const active = REPORT_FILTER_KEYS.filter((key) => isFilterValueActive(filters[key]))

  if (active.length === 0) return null

  const remove = (key: keyof FlowFilters) => {
    const next = { ...filters }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {active.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#163526]/10 dark:bg-[#c9a96e]/15 text-[#163526] dark:text-[#c9a96e] border border-[#163526]/20 dark:border-[#c9a96e]/25"
        >
          <span className="text-[10px] font-normal opacity-70">{KEY_LABELS[key]}:</span>
          {resolveValue(key, filters[key], categories)}
          <button
            onClick={() => remove(key)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={`Usuń filtr ${KEY_LABELS[key]}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {active.length > 1 && (
        <button
          onClick={() => onChange({ walletId: filters.walletId })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Wyczyść wszystkie
        </button>
      )}
    </div>
  )
}

export function countActiveReportFilterChips(filters: FlowFilters): number {
  return REPORT_FILTER_KEYS.filter((key) => isFilterValueActive(filters[key])).length
}
