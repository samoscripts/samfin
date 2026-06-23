import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRightLeft, GripVertical, Loader2, Pencil, X } from 'lucide-react'
import type { Category } from '@/shared/api/categories'
import CategoryDirectionsPills from './CategoryDirectionsPills'

export interface CategoryTreeRowProps {
  child: Category
  dimmed?: boolean
  deactivating: number | null
  onEdit: (id: number) => void
  onDeactivate: (item: Category) => void
  onMerge: (item: Category) => void
  onMove: (item: Category) => void
}

export default function CategoryTreeRow({
  child,
  dimmed = false,
  deactivating,
  onEdit,
  onDeactivate,
  onMerge,
  onMove,
}: CategoryTreeRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `child-${child.id}`,
    data: { type: 'child', category: child },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : undefined }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800',
        'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
        dimmed ? 'opacity-60' : '',
        isDragging ? 'bg-gray-50 dark:bg-gray-800/60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className="p-1 rounded text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Przeciągnij subkategorię ${child.name}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={14} />
      </button>

      <div className="flex-1 min-w-0 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-900 dark:text-gray-100">{child.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Subkategoria</span>
        </div>
        {child.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{child.description}</p>
        )}
      </div>

      <CategoryDirectionsPills directions={child.directions} />

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onMove(child)}
          title="Przenieś do innej grupy"
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowRightLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMerge(child)}
          title="Scal z inną subkategorią"
          className="p-1.5 rounded-md text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-xs font-medium px-2"
        >
          Scal
        </button>
        <button
          type="button"
          onClick={() => onEdit(child.id)}
          title="Edytuj"
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Pencil size={14} />
        </button>
        {child.active && (
          <button
            type="button"
            onClick={() => onDeactivate(child)}
            disabled={deactivating === child.id}
            title="Dezaktywuj"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
          >
            {deactivating === child.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}
