import { useCallback, useEffect, useState } from 'react'
import type { Category, CategoryDirection } from '@/shared/api/categories'
import {
  FREQUENT_FETCH_LIMIT,
  FREQUENT_INITIAL_VISIBLE,
  fetchFrequentCategoryPicks,
  type FrequentCategoryPick,
} from '@/shared/api/categoryPickEvents'
import { btnSecondary } from '@/shared/components/form/formClasses'
import { findCategoryById, formatCategoryLabel, isSelectableCategory } from '@/shared/utils/categoryOptions'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface CategoryFrequentChipsProps {
  categories: Category[]
  direction: CategoryDirection
  onSelect: (categoryId: number) => void
  refreshKey?: number
}

export default function CategoryFrequentChips({
  categories,
  direction,
  onSelect,
  refreshKey = 0,
}: CategoryFrequentChipsProps) {
  const [items, setItems] = useState<FrequentCategoryPick[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchFrequentCategoryPicks(direction, FREQUENT_FETCH_LIMIT)
      setItems(list)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się załadować najczęściej wybieranych.'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [direction])

  useEffect(() => {
    setExpanded(false)
    void load()
  }, [load, refreshKey])

  const visiblePicks = items.filter((pick) => {
    const category = findCategoryById(categories, pick.categoryId)
    return category != null && isSelectableCategory(category)
  })

  if (loading && visiblePicks.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Ładowanie…</p>
  }

  if (!loading && visiblePicks.length === 0 && !error) {
    return null
  }

  const displayItems = expanded
    ? visiblePicks
    : visiblePicks.slice(0, FREQUENT_INITIAL_VISIBLE)
  const canExpand = visiblePicks.length > FREQUENT_INITIAL_VISIBLE

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Najczęściej wybierane
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {displayItems.map((pick) => {
          const category = findCategoryById(categories, pick.categoryId)!
          return (
            <button
              key={pick.categoryId}
              type="button"
              onClick={() => onSelect(pick.categoryId)}
              className={[btnSecondary, 'px-3 py-1.5 text-xs'].join(' ')}
            >
              {formatCategoryLabel(category)}
            </button>
          )
        })}
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-[#1c4230] dark:text-[#c9a96e] hover:underline"
        >
          {expanded ? 'Pokaż mniej' : 'Pokaż więcej'}
        </button>
      )}
    </div>
  )
}
