import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import type { Concern } from '@/shared/api/concerns'
import type { Wallet } from '@/shared/api/wallets'
import type { FlowFilters } from '@/domains/home/transactions/types'
import type { TrendSeriesBy } from '@/domains/home/reports/trend/types/trend'
import { inputCls } from '@/shared/components/form/formClasses'
import CategorySelect from '@/shared/components/form/CategorySelect'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { FILTER_EMPTY_LABEL } from '@/domains/home/transactions/constants/labels'

function ChipList({
  items,
  onRemove,
}: {
  items: { id: string; label: string }[]
  onRemove: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {item.label}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            aria-label={`Usuń ${item.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  )
}

export function TrendDescriptionTermsPicker({
  terms,
  onChange,
}: {
  terms: string[]
  onChange: (terms: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const addTerm = () => {
    const trimmed = draft.trim()
    if (!trimmed || terms.includes(trimmed)) return
    onChange([...terms, trimmed])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTerm()
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="np. Allegro"
          className={[inputCls, 'flex-1'].join(' ')}
          aria-label="Dodaj opis do porównania"
        />
        <button
          type="button"
          onClick={addTerm}
          disabled={!draft.trim()}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
        >
          Dodaj
        </button>
      </div>
      <ChipList
        items={terms.map((t) => ({ id: t, label: t }))}
        onRemove={(id) => onChange(terms.filter((t) => t !== id))}
      />
    </div>
  )
}

export function TrendCategorySeriesPicker({
  categoryIds,
  categories,
  onChange,
}: {
  categoryIds: string[]
  categories: Category[]
  onChange: (ids: string[]) => void
}) {
  const [pick, setPick] = useState('')

  const add = (id: string) => {
    if (!id || categoryIds.includes(id)) return
    onChange([...categoryIds, id])
    setPick('')
  }

  const chips = categoryIds.map((id) => {
    const cat = categories.find((c) => String(c.id) === id)
    return { id, label: cat?.name ?? id }
  })

  return (
    <div>
      <CategorySelect
        categories={categories}
        value={pick}
        onChange={(v) => add(String(v ?? ''))}
        emptyLabel="Dodaj kategorię…"
      />
      <ChipList items={chips} onRemove={(id) => onChange(categoryIds.filter((x) => x !== id))} />
    </div>
  )
}

export function TrendDictionarySeriesPicker({
  label,
  ids,
  items,
  onChange,
}: {
  label: string
  ids: string[]
  items: { id: number; name: string; active?: boolean }[]
  onChange: (ids: string[]) => void
}) {
  const [pick, setPick] = useState('')

  const add = (id: string) => {
    if (!id || ids.includes(id)) return
    onChange([...ids, id])
    setPick('')
  }

  const chips = ids.map((id) => {
    const item = items.find((x) => String(x.id) === id)
    return { id, label: item?.name ?? id }
  })

  return (
    <div>
      <DictionarySelect
        items={items}
        value={pick}
        onChange={(v) => add(v == null ? '' : String(v))}
        emptyLabel={`Dodaj ${label.toLowerCase()}…`}
        valueType="string"
        filterItem={(item) => item.active !== false}
      />
      <ChipList items={chips} onRemove={(id) => onChange(ids.filter((x) => x !== id))} />
    </div>
  )
}

export function TrendNarrowFilters({
  seriesBy,
  narrow,
  onNarrowChange,
  concerns,
  categories,
  wallets,
}: {
  seriesBy: TrendSeriesBy
  narrow: FlowFilters
  onNarrowChange: <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => void
  concerns: Concern[]
  categories: Category[]
  wallets: Wallet[]
}) {
  const activeOnly = <T extends { active?: boolean }>(item: T) => item.active !== false

  return (
    <details open className="group">
      <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer list-none flex items-center justify-between">
        Zawęż wyniki
        <span className="text-[10px] font-normal normal-case text-gray-400">opcjonalnie</span>
      </summary>
      <div className="mt-3 space-y-4">
        {seriesBy !== 'description' && (
          <label className="block text-xs text-gray-500 dark:text-gray-500">
            Opis zawiera
            <input
              type="search"
              value={narrow.description ?? ''}
              onChange={(e) => onNarrowChange('description', e.target.value || undefined)}
              placeholder="np. Allegro"
              className={[inputCls, 'mt-1'].join(' ')}
            />
          </label>
        )}

        {seriesBy !== 'category' && (
          <label className="block text-xs text-gray-500 dark:text-gray-500">
            Kategoria
            <div className="mt-1">
              <CategorySelect
                categories={categories}
                value={narrow.categoryId ?? ''}
                onChange={(v) => onNarrowChange('categoryId', v ? String(v) : undefined)}
                emptyLabel={FILTER_EMPTY_LABEL}
              />
            </div>
          </label>
        )}

        {seriesBy !== 'wallet' && (
          <label className="block text-xs text-gray-500 dark:text-gray-500">
            Portfel
            <div className="mt-1">
              <DictionarySelect
                items={wallets}
                value={narrow.walletId ?? ''}
                onChange={(v) => onNarrowChange('walletId', v == null ? undefined : String(v))}
                emptyLabel={FILTER_EMPTY_LABEL}
                valueType="string"
                filterItem={activeOnly}
              />
            </div>
          </label>
        )}

        {seriesBy !== 'concern' && (
          <label className="block text-xs text-gray-500 dark:text-gray-500">
            Dotyczy
            <div className="mt-1">
              <DictionarySelect
                items={concerns}
                value={narrow.concernId ?? ''}
                onChange={(v) => onNarrowChange('concernId', v == null ? undefined : String(v))}
                emptyLabel={FILTER_EMPTY_LABEL}
                valueType="string"
                filterItem={activeOnly}
              />
            </div>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-500">
            Kwota od
            <input
              type="number"
              min={0}
              value={narrow.amountMin ?? ''}
              onChange={(e) => onNarrowChange('amountMin', e.target.value || undefined)}
              className={[inputCls, 'mt-1'].join(' ')}
            />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-500">
            Kwota do
            <input
              type="number"
              min={0}
              value={narrow.amountMax ?? ''}
              onChange={(e) => onNarrowChange('amountMax', e.target.value || undefined)}
              className={[inputCls, 'mt-1'].join(' ')}
            />
          </label>
        </div>
      </div>
    </details>
  )
}
