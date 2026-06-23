import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { updateCategory, type Category } from '@/shared/api/categories'
import { getApiErrorMessage } from '@/shared/utils/errors'
import {
  buildCategoryTree,
  canMoveChildToParent,
  type CategoryTreeData,
} from '../utils/categoryTree'
import CategoryTreeGroup from './CategoryTreeGroup'
import CategoryTreeRow from './CategoryTreeRow'

const EXPANDED_STORAGE_KEY = 'samfin:categories-expanded'

function loadExpandedIds(groups: CategoryTreeData): Set<number> {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as number[]
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch {
    /* ignore */
  }
  return new Set(groups.groups.map((g) => g.parent.id))
}

function saveExpandedIds(ids: Set<number>) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export interface CategoryTreeListProps {
  title: string
  items: Category[]
  dimmed?: boolean
  deactivating: number | null
  onEdit: (id: number) => void
  onDeactivate: (item: Category) => void
  onMerge: (item: Category) => void
  onMove: (item: Category) => void
  onItemsChange: (updater: (prev: Category[]) => Category[]) => void
}

export default function CategoryTreeList({
  title,
  items,
  dimmed = false,
  deactivating,
  onEdit,
  onDeactivate,
  onMerge,
  onMove,
  onItemsChange,
}: CategoryTreeListProps) {
  const tree = useMemo(() => buildCategoryTree(items), [items])
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => loadExpandedIds(tree))
  const [draggingChild, setDraggingChild] = useState<Category | null>(null)
  const [activeDropParentId, setActiveDropParentId] = useState<number | null>(null)
  const [invalidDropParentId, setInvalidDropParentId] = useState<number | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      for (const g of tree.groups) {
        if (!next.has(g.parent.id) && g.children.length > 0) {
          next.add(g.parent.id)
        }
      }
      return next
    })
  }, [tree.groups])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const allExpanded = tree.groups.length > 0 && tree.groups.every((g) => expandedIds.has(g.parent.id))

  const toggleExpanded = useCallback((parentId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      saveExpandedIds(next)
      return next
    })
  }, [])

  const setAllExpanded = useCallback(
    (expanded: boolean) => {
      const next = expanded ? new Set(tree.groups.map((g) => g.parent.id)) : new Set<number>()
      setExpandedIds(next)
      saveExpandedIds(next)
    },
    [tree.groups],
  )

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'child' && data.category) {
      setDraggingChild(data.category as Category)
      setMoveError(null)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!draggingChild || !event.over) {
      setActiveDropParentId(null)
      setInvalidDropParentId(null)
      return
    }
    const overData = event.over.data.current
    if (overData?.type !== 'parent' || !overData.category) {
      setActiveDropParentId(null)
      setInvalidDropParentId(null)
      return
    }
    const parent = overData.category as Category
    if (canMoveChildToParent(draggingChild, parent)) {
      setActiveDropParentId(parent.id)
      setInvalidDropParentId(null)
    } else {
      setActiveDropParentId(null)
      setInvalidDropParentId(parent.id)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const child = draggingChild
    setDraggingChild(null)
    setActiveDropParentId(null)
    setInvalidDropParentId(null)

    if (!child || !event.over) return

    const overData = event.over.data.current
    if (overData?.type !== 'parent' || !overData.category) return

    const parent = overData.category as Category
    if (!canMoveChildToParent(child, parent)) {
      setMoveError('Nie można przenieść do tej grupy (niezgodne kierunki lub ta sama grupa).')
      return
    }

    try {
      const updated = await updateCategory(child.id, { parentId: parent.id })
      onItemsChange((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      )
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.add(parent.id)
        saveExpandedIds(next)
        return next
      })
    } catch (err: unknown) {
      setMoveError(getApiErrorMessage(err, 'Nie udało się przenieść kategorii.'))
    }
  }

  function handleDragCancel() {
    setDraggingChild(null)
    setActiveDropParentId(null)
    setInvalidDropParentId(null)
  }

  if (tree.groups.length === 0 && tree.orphans.length === 0) return null

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {title}
          </h3>
          {tree.groups.length > 0 && (
            <button
              type="button"
              onClick={() => setAllExpanded(!allExpanded)}
              className="text-xs text-[#8a7340] dark:text-[#c9a96e] hover:underline"
            >
              {allExpanded ? 'Zwiń wszystkie' : 'Rozwiń wszystkie'}
            </button>
          )}
        </div>

        {moveError && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-2 px-1">{moveError}</p>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={(e) => void handleDragEnd(e)}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-3">
            {tree.groups.map((node) => (
              <CategoryTreeGroup
                key={node.parent.id}
                node={node}
                expanded={expandedIds.has(node.parent.id)}
                dimmed={dimmed}
                deactivating={deactivating}
                activeDropParentId={activeDropParentId}
                invalidDropParentId={invalidDropParentId}
                onToggle={toggleExpanded}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onMerge={onMerge}
                onMove={onMove}
              />
            ))}

            {tree.orphans.length > 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Bez grupy
                </div>
                {tree.orphans.map((child) => (
                  <CategoryTreeRow
                    key={child.id}
                    child={child}
                    dimmed={dimmed}
                    deactivating={deactivating}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onMerge={onMerge}
                    onMove={onMove}
                  />
                ))}
              </div>
            )}
          </div>

          <DragOverlay>
            {draggingChild ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-sm font-medium">
                <GripVertical size={14} className="text-gray-400" />
                {draggingChild.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}
