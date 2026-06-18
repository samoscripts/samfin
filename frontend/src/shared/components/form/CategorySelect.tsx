import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { createCategory, type Category, type CategoryType } from '@/shared/api/categories'
import Select from '@/shared/components/form/Select'
import { btnSecondary, configInputCls, configSelectCls, selectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'
import {
  buildCategoryGroups,
  filterCategoryGroups,
  findCategoryById,
  formatCategoryLabel,
  prepareCategoriesForSelect,
} from '@/shared/utils/categoryOptions'

export type CategorySelectValueType = 'string' | 'number'

export interface CategorySelectProps {
  categories: Category[]
  value: string | number | null | undefined
  onChange: (value: string | number | null) => void
  emptyLabel?: string
  valueType?: CategorySelectValueType
  direction?: CategoryType | ''
  disabled?: boolean
  className?: string
  allowQuickAdd?: boolean
  onCategoryCreated?: (category: Category) => void | Promise<void>
}

type FlatOption = { category: Category; groupName: string }

function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('pl')
}

export default function CategorySelect({
  categories,
  value,
  onChange,
  emptyLabel = '— brak —',
  valueType = 'number',
  direction = '',
  disabled = false,
  className,
  allowQuickAdd = false,
  onCategoryCreated,
}: CategorySelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickType, setQuickType] = useState<CategoryType>(
    direction === 'INCOME' ? 'INCOME' : 'EXPENSE',
  )
  const [quickParentId, setQuickParentId] = useState<number | ''>('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  const prepared = useMemo(
    () => prepareCategoriesForSelect(categories, direction),
    [categories, direction],
  )

  const groups = useMemo(() => {
    const built = buildCategoryGroups(prepared)
    return filterCategoryGroups(built, query)
  }, [prepared, query])

  const flatOptions: FlatOption[] = useMemo(
    () => groups.flatMap((g) => g.children.map((category) => ({ category, groupName: g.parentName }))),
    [groups],
  )

  const parentOptions = useMemo(
    () =>
      prepared
        .filter((c) => c.parentId == null)
        .filter((c) => c.type === quickType)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [prepared, quickType],
  )

  const numericValue =
    value === null || value === undefined || value === '' ? null : Number(value)

  const selected = findCategoryById(prepared, numericValue)
  const displayLabel = selected ? formatCategoryLabel(selected) : emptyLabel
  const hasValue = selected != null

  const showQuickAddRow =
    allowQuickAdd &&
    !disabled &&
    normalizeSearch(query).length > 0 &&
    flatOptions.length === 0

  const listItemCount = flatOptions.length + (showQuickAddRow ? 1 : 0)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(0)
    setQuickAddOpen(false)
    setQuickError(null)
  }, [])

  const emitChange = useCallback(
    (categoryId: number | null) => {
      if (categoryId === null) {
        onChange(null)
        return
      }
      onChange(valueType === 'number' ? categoryId : String(categoryId))
    },
    [onChange, valueType],
  )

  const selectOption = useCallback(
    (option: FlatOption) => {
      emitChange(option.category.id)
      close()
    },
    [close, emitChange],
  )

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    setHighlightIndex(0)
  }, [open])

  useEffect(() => {
    if (highlightIndex >= listItemCount) {
      setHighlightIndex(Math.max(0, listItemCount - 1))
    }
  }, [listItemCount, highlightIndex])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [close, open])

  useEffect(() => {
    if (direction === 'EXPENSE' || direction === 'INCOME') {
      setQuickType(direction)
    }
  }, [direction])

  useEffect(() => {
    if (quickParentId === '') return
    const parent = parentOptions.find((p) => p.id === quickParentId)
    if (!parent) setQuickParentId('')
  }, [parentOptions, quickParentId])

  function openQuickAdd() {
    setQuickName(query.trim())
    setQuickType(direction === 'INCOME' ? 'INCOME' : direction === 'EXPENSE' ? 'EXPENSE' : 'EXPENSE')
    setQuickParentId(parentOptions[0]?.id ?? '')
    setQuickError(null)
    setQuickAddOpen(true)
  }

  async function handleQuickAdd() {
    const name = quickName.trim()
    if (!name) {
      setQuickError('Podaj nazwę subkategorii.')
      return
    }
    if (quickParentId === '') {
      setQuickError('Wybierz kategorię główną.')
      return
    }

    setQuickSaving(true)
    setQuickError(null)
    try {
      const category = await createCategory({
        name,
        type: quickType,
        parentId: Number(quickParentId),
        description: null,
        active: true,
      })
      await onCategoryCreated?.(category)
      emitChange(category.id)
      close()
    } catch (err: unknown) {
      setQuickError(getApiErrorMessage(err, 'Nie udało się dodać kategorii.'))
    } finally {
      setQuickSaving(false)
    }
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    void handleQuickAdd()
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (quickAddOpen) {
        setQuickAddOpen(false)
        return
      }
      close()
      return
    }
    if (quickAddOpen) return
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
        openQuickAdd()
        return
      }
      if (flatOptions[highlightIndex]) {
        selectOption(flatOptions[highlightIndex])
      }
    }
  }

  let optionCounter = -1

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={[
          className ?? selectCls,
          'flex items-center justify-between gap-2 text-left',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="truncate">{displayLabel}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {hasValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Wyczyść kategorię"
              className="p-0.5 rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80 text-gray-400"
              onClick={(e) => {
                e.stopPropagation()
                emitChange(null)
                close()
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlightIndex(0)
                  setQuickAddOpen(false)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Szukaj kategorii…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
            </div>
          </div>

          {quickAddOpen ? (
            <div className="p-3 space-y-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nowa subkategoria</p>
              <input
                type="text"
                className={configInputCls}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="Nazwa subkategorii"
                autoFocus
              />
              <Select
                className={configSelectCls}
                value={quickParentId === '' ? '' : String(quickParentId)}
                onChange={(e) => setQuickParentId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">— kategoria główna —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Select
                className={configSelectCls}
                value={quickType}
                onChange={(e) => {
                  setQuickType(e.target.value as CategoryType)
                  setQuickParentId('')
                }}
                disabled={direction === 'EXPENSE' || direction === 'INCOME'}
              >
                <option value="EXPENSE">Wydatek</option>
                <option value="INCOME">Wpływ</option>
              </Select>
              {parentOptions.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Brak kategorii głównych dla wybranego typu.
                </p>
              )}
              {quickError && (
                <p className="text-xs text-red-600 dark:text-red-400">{quickError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={[btnSecondary, 'flex-1 py-1.5 text-xs'].join(' ')}
                  onClick={() => setQuickAddOpen(false)}
                  disabled={quickSaving}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg text-white bg-[#1c4230] hover:opacity-90 disabled:opacity-50"
                  disabled={quickSaving || parentOptions.length === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleQuickAdd()
                  }}
                >
                  {quickSaving ? 'Zapisywanie…' : 'Dodaj'}
                </button>
              </div>
            </div>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
              aria-activedescendant={
                flatOptions[highlightIndex]
                  ? `${listboxId}-opt-${flatOptions[highlightIndex].category.id}`
                  : undefined
              }
            >
              {flatOptions.length === 0 && !showQuickAddRow ? (
                <li className="px-3 py-2 text-sm text-gray-400">Brak wyników</li>
              ) : (
                <>
                  {groups.map((group) => (
                    <li key={group.parentId} role="presentation">
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
                                aria-selected={category.id === numericValue}
                                className={[
                                  'w-full text-left px-3 py-2 text-sm pl-5',
                                  highlighted
                                    ? 'bg-[#c9a96e]/15 text-gray-900 dark:text-gray-100'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                                  category.id === numericValue ? 'font-medium' : '',
                                ].join(' ')}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                onClick={() => selectOption({ category, groupName: group.parentName })}
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
                          'w-full text-left px-3 py-2 text-sm flex items-center gap-2',
                          highlightIndex === flatOptions.length
                            ? 'bg-[#c9a96e]/15 text-[#1c4230] dark:text-[#c9a96e]'
                            : 'text-[#1c4230] dark:text-[#c9a96e] hover:bg-amber-50 dark:hover:bg-amber-950/20',
                        ].join(' ')}
                        onMouseEnter={() => setHighlightIndex(flatOptions.length)}
                        onClick={openQuickAdd}
                      >
                        <Plus size={14} />
                        Dodaj subkategorię „{query.trim()}”
                      </button>
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
