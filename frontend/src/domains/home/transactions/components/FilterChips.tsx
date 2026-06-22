import { X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import { formatCategoryLabel } from '@/shared/utils/categoryOptions'
import { FlowFilters, isFilterValueActive } from '../types'
import {
  DIRECTION_LABEL_BY_VALUE,
  STATUS_LABEL_BY_VALUE,
} from '../constants/labels'

const KEY_LABELS: Record<keyof FlowFilters, string> = {
  dateFrom:        'Data od',
  dateTo:          'Data do',
  directions:      'Typ',
  walletId:        'Portfel',
  concernId:       'Dotyczy',
  categoryId:      'Kategoria',
  statuses:        'Status',
  paidFromPartyId: 'Skąd',
  paidToPartyId:   'Dokąd',
  amountMin:       'Kwota od',
  amountMax:       'Kwota do',
  description:     'Opis',
}

function resolveValue(
  key: keyof FlowFilters,
  value: FlowFilters[keyof FlowFilters],
  categories: Category[],
): string {
  switch (key) {
    case 'directions':
      return (value as string[]).map((v) => DIRECTION_LABEL_BY_VALUE[v] ?? v).join(', ')
    case 'statuses':
      return (value as string[]).map((v) => STATUS_LABEL_BY_VALUE[v] ?? v).join(', ')
    case 'amountMin': return `${value} zł`
    case 'amountMax': return `${value} zł`
    case 'categoryId': {
      const cat = categories.find((c) => String(c.id) === value)
      return cat ? formatCategoryLabel(cat) : String(value)
    }
    default:          return String(value)
  }
}

interface FilterChipsProps {
  filters: FlowFilters
  categories: Category[]
  onChange: (filters: FlowFilters) => void
}

export default function FilterChips({ filters, categories, onChange }: FilterChipsProps) {
  const active = (Object.entries(filters) as [keyof FlowFilters, FlowFilters[keyof FlowFilters]][]).filter(
    ([, v]) => isFilterValueActive(v),
  )

  if (active.length === 0) return null

  const remove = (key: keyof FlowFilters) => {
    const next = { ...filters }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {active.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#163526]/10 dark:bg-[#c9a96e]/15 text-[#163526] dark:text-[#c9a96e] border border-[#163526]/20 dark:border-[#c9a96e]/25"
        >
          <span className="text-[10px] font-normal opacity-70">{KEY_LABELS[key]}:</span>
          {resolveValue(key, value, categories)}
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
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Wyczyść wszystkie
        </button>
      )}
    </div>
  )
}
