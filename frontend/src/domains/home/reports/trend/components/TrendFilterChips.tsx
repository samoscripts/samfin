import { X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import type { Concern } from '@/shared/api/concerns'
import type { Wallet } from '@/shared/api/wallets'
import { formatCategoryLabel } from '@/shared/utils/categoryOptions'
import type { TrendQueryState } from '@/domains/home/reports/trend/types/trend'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'

interface TrendFilterChipsProps {
  query: TrendQueryState
  categories: Category[]
  wallets: Wallet[]
  concerns: Concern[]
  onChange: (query: TrendQueryState) => void
}

export default function TrendFilterChips({
  query,
  categories,
  wallets,
  concerns,
  onChange,
}: TrendFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (query.seriesBy !== 'none') {
    const seriesLabel =
      query.seriesBy === 'description'
        ? 'Opisy'
        : query.seriesBy === 'category'
          ? 'Kategorie'
          : query.seriesBy === 'wallet'
            ? 'Portfele'
            : 'Dotyczy'
    chips.push({
      key: 'seriesBy',
      label: `Porównaj: ${seriesLabel}`,
      onRemove: () => onChange({ ...query, seriesBy: 'none', terms: [], categoryIds: [], walletIds: [], concernIds: [] }),
    })
  }

  for (const term of query.terms) {
    chips.push({
      key: `term-${term}`,
      label: `Opis: ${term}`,
      onRemove: () => onChange({ ...query, terms: query.terms.filter((t) => t !== term) }),
    })
  }

  for (const id of query.categoryIds) {
    const cat = categories.find((c) => String(c.id) === id)
    chips.push({
      key: `cat-${id}`,
      label: `Kategoria: ${cat ? formatCategoryLabel(cat) : id}`,
      onRemove: () => onChange({ ...query, categoryIds: query.categoryIds.filter((x) => x !== id) }),
    })
  }

  for (const id of query.walletIds) {
    const wallet = wallets.find((w) => String(w.id) === id)
    chips.push({
      key: `wallet-${id}`,
      label: `Portfel: ${wallet?.name ?? id}`,
      onRemove: () => onChange({ ...query, walletIds: query.walletIds.filter((x) => x !== id) }),
    })
  }

  for (const id of query.concernIds) {
    const concern = concerns.find((c) => String(c.id) === id)
    chips.push({
      key: `concern-${id}`,
      label: `Dotyczy: ${concern?.name ?? id}`,
      onRemove: () => onChange({ ...query, concernIds: query.concernIds.filter((x) => x !== id) }),
    })
  }

  if (!(query.directions.length === 1 && query.directions[0] === 'EXPENSE')) {
    chips.push({
      key: 'directions',
      label: query.directions.map((d) => DIRECTION_LABEL_BY_VALUE[d]).join(', '),
      onRemove: () => onChange({ ...query, directions: ['EXPENSE'] }),
    })
  }

  if (query.narrow.description) {
    chips.push({
      key: 'narrow-desc',
      label: `Zawężenie: ${query.narrow.description}`,
      onRemove: () => onChange({ ...query, narrow: { ...query.narrow, description: undefined } }),
    })
  }

  if (query.narrow.categoryId) {
    const cat = categories.find((c) => String(c.id) === query.narrow.categoryId)
    chips.push({
      key: 'narrow-cat',
      label: `Kategoria: ${cat ? formatCategoryLabel(cat) : query.narrow.categoryId}`,
      onRemove: () => onChange({ ...query, narrow: { ...query.narrow, categoryId: undefined } }),
    })
  }

  if (query.narrow.walletId) {
    const wallet = wallets.find((w) => String(w.id) === query.narrow.walletId)
    chips.push({
      key: 'narrow-wallet',
      label: `Portfel: ${wallet?.name ?? query.narrow.walletId}`,
      onRemove: () => onChange({ ...query, narrow: { ...query.narrow, walletId: undefined } }),
    })
  }

  if (query.narrow.concernId) {
    const concern = concerns.find((c) => String(c.id) === query.narrow.concernId)
    chips.push({
      key: 'narrow-concern',
      label: `Dotyczy: ${concern?.name ?? query.narrow.concernId}`,
      onRemove: () => onChange({ ...query, narrow: { ...query.narrow, concernId: undefined } }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[#163526]/10 dark:bg-[#c9a96e]/15 text-[#163526] dark:text-[#c9a96e] border border-[#163526]/20 dark:border-[#c9a96e]/25"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={`Usuń ${chip.label}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  )
}
