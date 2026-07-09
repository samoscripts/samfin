import { X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import { formatCategoryLabel } from '@/shared/utils/categoryOptions'
import type { RuleListFilters } from '../types/ruleFilters'
import { isRuleFilterValueActive } from '../types/ruleFilters'

const KEY_LABELS: Record<keyof RuleListFilters, string> = {
  walletId: 'Portfel',
  concernId: 'Dotyczy',
  categoryId: 'Kategoria',
  name: 'Nazwa',
  descriptionCondition: 'Opis w warunkach',
}

function resolveValue(
  key: keyof RuleListFilters,
  value: RuleListFilters[keyof RuleListFilters],
  wallets: Wallet[],
  concerns: Concern[],
  categories: Category[],
): string {
  if (key === 'walletId') {
    const w = wallets.find((x) => String(x.id) === value)
    return w?.name ?? String(value)
  }
  if (key === 'concernId') {
    const c = concerns.find((x) => String(x.id) === value)
    return c?.name ?? String(value)
  }
  if (key === 'categoryId') {
    const cat = categories.find((c) => String(c.id) === value)
    return cat ? formatCategoryLabel(cat) : String(value)
  }
  return String(value)
}

export interface RuleFilterChipsProps {
  filters: RuleListFilters
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  onChange: (filters: RuleListFilters) => void
}

export default function RuleFilterChips({
  filters,
  wallets,
  concerns,
  categories,
  onChange,
}: RuleFilterChipsProps) {
  const entries = (Object.keys(KEY_LABELS) as (keyof RuleListFilters)[]).filter((key) =>
    isRuleFilterValueActive(filters[key]),
  )

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
        >
          <span className="text-gray-400 dark:text-gray-500">{KEY_LABELS[key]}:</span>
          {resolveValue(key, filters[key], wallets, concerns, categories)}
          <button
            type="button"
            onClick={() => onChange({ ...filters, [key]: undefined })}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label={`Usuń filtr ${KEY_LABELS[key]}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  )
}
