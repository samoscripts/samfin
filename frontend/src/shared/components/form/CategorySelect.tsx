import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { Category, CategoryType } from '@/shared/api/categories'
import { selectCls } from '@/shared/components/form/formClasses'
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
}

type FlatOption = { category: Category; groupName: string }

export default function CategorySelect({
  categories,
  value,
  onChange,
  emptyLabel = '— brak —',
  valueType = 'number',
  direction = '',
  disabled = false,
  className,
}: CategorySelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

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

  const numericValue =
    value === null || value === undefined || value === '' ? null : Number(value)

  const selected = findCategoryById(prepared, numericValue)
  const displayLabel = selected ? formatCategoryLabel(selected) : emptyLabel
  const hasValue = selected != null

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(0)
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
    if (highlightIndex >= flatOptions.length) {
      setHighlightIndex(Math.max(0, flatOptions.length - 1))
    }
  }, [flatOptions.length, highlightIndex])

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
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, flatOptions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && flatOptions[highlightIndex]) {
      e.preventDefault()
      selectOption(flatOptions[highlightIndex])
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
          !hasValue ? 'text-gray-400 dark:text-gray-500' : '',
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
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Szukaj kategorii…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
            </div>
          </div>

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
            {flatOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">Brak wyników</li>
            ) : (
              groups.map((group) => (
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
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
