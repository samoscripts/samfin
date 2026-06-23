import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, Loader2, Pencil, X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import type { CategoryTreeNode } from '../utils/categoryTree'
import CategoryDirectionsPills from './CategoryDirectionsPills'
import CategoryTreeRow from './CategoryTreeRow'

export interface CategoryTreeGroupProps {
  node: CategoryTreeNode
  expanded: boolean
  dimmed?: boolean
  deactivating: number | null
  activeDropParentId: number | null
  invalidDropParentId: number | null
  onToggle: (parentId: number) => void
  onEdit: (id: number) => void
  onDeactivate: (item: Category) => void
  onMerge: (item: Category) => void
  onMove: (item: Category) => void
}

export default function CategoryTreeGroup({
  node,
  expanded,
  dimmed = false,
  deactivating,
  activeDropParentId,
  invalidDropParentId,
  onToggle,
  onEdit,
  onDeactivate,
  onMerge,
  onMove,
}: CategoryTreeGroupProps) {
  const { parent, children } = node
  const hasChildren = children.length > 0
  const dropId = `parent-${parent.id}`

  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: 'parent', category: parent },
  })

  const isActiveDrop = isOver && activeDropParentId === parent.id
  const isInvalidDrop = isOver && invalidDropParentId === parent.id

  return (
    <div
      className={[
        'rounded-xl border overflow-hidden transition-colors',
        dimmed ? 'opacity-60' : '',
        isActiveDrop
          ? 'border-[#c9a96e] ring-2 ring-[#c9a96e]/30'
          : isInvalidDrop
            ? 'border-red-400 ring-2 ring-red-400/30'
            : 'border-gray-200 dark:border-gray-700',
      ].join(' ')}
    >
      <div
        ref={setNodeRef}
        className={[
          'flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/60',
          isActiveDrop ? 'bg-[#c9a96e]/10 dark:bg-[#c9a96e]/10' : '',
          isInvalidDrop ? 'bg-red-50 dark:bg-red-950/20' : '',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(parent.id)}
          disabled={!hasChildren}
          aria-expanded={hasChildren ? expanded : undefined}
          className={[
            'p-0.5 rounded text-gray-400 transition-transform',
            hasChildren ? 'hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer' : 'opacity-30 cursor-default',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
        >
          <ChevronDown size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{parent.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Grupa</span>
            {hasChildren && (
              <span className="text-xs text-gray-400">({children.length})</span>
            )}
          </div>
          {parent.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{parent.description}</p>
          )}
        </div>

        <CategoryDirectionsPills directions={parent.directions} />

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(parent.id)}
            title="Edytuj"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
          {parent.active && (
            <button
              type="button"
              onClick={() => onDeactivate(parent)}
              disabled={deactivating === parent.id}
              title="Dezaktywuj"
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
            >
              {deactivating === parent.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded &&
        children.map((child) => (
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

      {expanded && !hasChildren && (
        <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
          Brak subkategorii — przeciągnij tutaj lub dodaj nową.
        </p>
      )}
    </div>
  )
}
