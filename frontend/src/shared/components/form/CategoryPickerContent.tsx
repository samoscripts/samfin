import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Category, CategoryDirection } from '@/shared/api/categories'
import { recordCategoryPick } from '@/shared/api/categoryPickEvents'
import CategoryFrequentChips from '@/shared/components/form/CategoryFrequentChips'
import CategoryQuickAddForm from '@/shared/components/form/CategoryQuickAddForm'
import PickerSearchField from '@/shared/components/form/PickerSearchField'
import { btnSecondary } from '@/shared/components/form/formClasses'
import {
  buildCategoryGroups,
  categoryMatchesQuery,
  filterCategoryGroups,
  prepareCategoriesForSelect,
} from '@/shared/utils/categoryOptions'
import type { CategorySelectMode } from '@/shared/components/form/CategorySelect'

type FlatOption = { category: Category; groupName: string }

function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('pl')
}

export interface CategoryPickerContentProps {
  categories: Category[]
  selectedId: number | null
  direction: CategoryDirection | ''
  selectable: CategorySelectMode
  allowQuickAdd: boolean
  onSelect: (categoryId: number) => void
  onCategoryCreated?: (category: Category) => void | Promise<void>
}

export default function CategoryPickerContent({
  categories,
  selectedId,
  direction,
  selectable,
  allowQuickAdd,
  onSelect,
  onCategoryCreated,
}: CategoryPickerContentProps) {
  const listboxId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [view, setView] = useState<'list' | 'quickAdd'>('list')
  const [frequentRefreshKey, setFrequentRefreshKey] = useState(0)

  const showFrequent = selectable === 'child' && (direction === 'EXPENSE' || direction === 'INCOME')

  const prepared = useMemo(() => {
    if (selectable === 'group') {
      return prepareCategoriesForSelect(categories)
        .filter((c) => c.parentId == null)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    }
    return prepareCategoriesForSelect(categories)
  }, [categories, selectable])

  const groups = useMemo(() => {
    if (selectable === 'group') return []
    const built = buildCategoryGroups(prepared)
    return filterCategoryGroups(built, query)
  }, [prepared, query, selectable])

  const flatOptions: FlatOption[] = useMemo(() => {
    if (selectable === 'group') {
      return prepared
        .filter((c) => categoryMatchesQuery(c, query))
        .map((category) => ({ category, groupName: '' }))
    }
    return groups.flatMap((g) => g.children.map((category) => ({ category, groupName: g.parentName })))
  }, [groups, prepared, query, selectable])

  const showQuickAddRow =
    selectable === 'child' &&
    allowQuickAdd &&
    view === 'list' &&
    normalizeSearch(query).length > 0 &&
    flatOptions.length === 0

  const listItemCount = flatOptions.length + (showQuickAddRow ? 1 : 0)

  useEffect(() => {
    setHighlightIndex(0)
  }, [query, view])

  useEffect(() => {
    if (highlightIndex >= listItemCount) {
      setHighlightIndex(Math.max(0, listItemCount - 1))
    }
  }, [listItemCount, highlightIndex])

  function pickCategory(categoryId: number) {
    if (showFrequent) {
      void recordCategoryPick(categoryId, direction).catch(() => {})
    }
    onSelect(categoryId)
  }

  async function handleCategoryCreated(category: Category) {
    await onCategoryCreated?.(category)
    setFrequentRefreshKey((k) => k + 1)
    pickCategory(category.id)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (view === 'quickAdd') return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, listItemCount - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showQuickAddRow && highlightIndex === flatOptions.length) {
        setView('quickAdd')
        return
      }
      if (flatOptions[highlightIndex]) {
        pickCategory(flatOptions[highlightIndex].category.id)
      }
    }
  }

  if (view === 'quickAdd') {
    return (
      <CategoryQuickAddForm
        categories={categories}
        initialName={query.trim()}
        onCancel={() => setView('list')}
        onCreated={handleCategoryCreated}
      />
    )
  }

  let optionCounter = -1

  return (
    <>
      {showFrequent && (
        <CategoryFrequentChips
          categories={categories}
          direction={direction}
          refreshKey={frequentRefreshKey}
          onSelect={pickCategory}
        />
      )}

      <PickerSearchField
        ref={searchRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleSearchKeyDown}
        placeholder="Szukaj kategorii…"
      />

      <ul
        id={listboxId}
        role="listbox"
        className="pb-2"
        aria-activedescendant={
          flatOptions[highlightIndex]
            ? `${listboxId}-opt-${flatOptions[highlightIndex].category.id}`
            : undefined
        }
      >
        {flatOptions.length === 0 && !showQuickAddRow ? (
          <li className="py-2 text-sm text-gray-400">Brak wyników</li>
        ) : selectable === 'group' ? (
          flatOptions.map((option, idx) => {
            const highlighted = idx === highlightIndex
            return (
              <li key={option.category.id} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-opt-${option.category.id}`}
                  role="option"
                  aria-selected={option.category.id === selectedId}
                  className={[
                    'w-full text-left px-3 py-2 text-sm rounded-md',
                    highlighted
                      ? 'bg-[#c9a96e]/15 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    option.category.id === selectedId ? 'font-medium' : '',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => pickCategory(option.category.id)}
                >
                  {option.category.name}
                </button>
              </li>
            )
          })
        ) : (
          <>
            {groups.map((group) => (
              <li key={group.parentId} role="presentation" className="mb-1">
                <div
                  className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 select-none"
                  aria-hidden
                >
                  {group.parentName}
                </div>
                <ul role="group" aria-label={group.parentName}>
                  {group.children.map((category) => {
                    optionCounter += 1
                    const idx = optionCounter
                    const highlighted = idx === highlightIndex
                    return (
                      <li key={category.id} role="presentation">
                        <button
                          type="button"
                          id={`${listboxId}-opt-${category.id}`}
                          role="option"
                          aria-selected={category.id === selectedId}
                          className={[
                            'w-full text-left px-3 py-2 text-sm pl-5 rounded-md',
                            highlighted
                              ? 'bg-[#c9a96e]/15 text-gray-900 dark:text-gray-100'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                            category.id === selectedId ? 'font-medium' : '',
                          ].join(' ')}
                          onMouseEnter={() => setHighlightIndex(idx)}
                          onClick={() => pickCategory(category.id)}
                        >
                          {category.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
            {showQuickAddRow && (
              <li role="presentation">
                <button
                  type="button"
                  className={[
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md',
                    highlightIndex === flatOptions.length
                      ? 'bg-[#c9a96e]/15 text-[#1c4230] dark:text-[#c9a96e]'
                      : 'text-[#1c4230] dark:text-[#c9a96e] hover:bg-amber-50 dark:hover:bg-amber-950/20',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightIndex(flatOptions.length)}
                  onClick={() => setView('quickAdd')}
                >
                  <Plus size={14} />
                  Dodaj subkategorię „{query.trim()}”
                </button>
              </li>
            )}
          </>
        )}
      </ul>

      {allowQuickAdd && selectable === 'child' && !showQuickAddRow && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            type="button"
            className={[btnSecondary, 'w-full py-2 text-xs flex items-center justify-center gap-1.5'].join(' ')}
            onClick={() => setView('quickAdd')}
          >
            <Plus size={14} />
            Dodaj nową subkategorię
          </button>
        </div>
      )}
    </>
  )
}
