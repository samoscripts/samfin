import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { Category, CategoryDirection } from '@/shared/api/categories'
import CategoryPickerContent from '@/shared/components/form/CategoryPickerContent'
import PickerOverlay from '@/shared/components/form/PickerOverlay'
import { selectCls } from '@/shared/components/form/formClasses'
import {
  findCategoryById,
  formatCategoryLabel,
  prepareCategoriesForSelect,
} from '@/shared/utils/categoryOptions'

export type CategorySelectValueType = 'string' | 'number'
export type CategorySelectMode = 'child' | 'group'

export interface CategorySelectProps {
  categories: Category[]
  value: string | number | null | undefined
  onChange: (value: string | number | null) => void
  emptyLabel?: string
  valueType?: CategorySelectValueType
  direction?: CategoryDirection | ''
  /** `child` — subkategorie (domyślnie); `group` — tylko grupy główne (parentId = null) */
  selectable?: CategorySelectMode
  disabled?: boolean
  className?: string
  allowQuickAdd?: boolean
  onCategoryCreated?: (category: Category) => void | Promise<void>
}

export default function CategorySelect({
  categories,
  value,
  onChange,
  emptyLabel = '— brak —',
  valueType = 'number',
  direction = '',
  selectable = 'child',
  disabled = false,
  className,
  allowQuickAdd = false,
  onCategoryCreated,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)

  const prepared = useMemo(() => {
    if (selectable === 'group') {
      return prepareCategoriesForSelect(categories)
        .filter((c) => c.parentId == null)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    }
    return prepareCategoriesForSelect(categories)
  }, [categories, selectable])

  const numericValue =
    value === null || value === undefined || value === '' ? null : Number(value)

  const selected = findCategoryById(prepared, numericValue)
  const displayLabel =
    selected
      ? selectable === 'group'
        ? selected.name
        : formatCategoryLabel(selected)
      : emptyLabel
  const hasValue = selected != null

  const close = useCallback(() => {
    setOpen(false)
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

  const handleSelect = useCallback(
    (categoryId: number) => {
      emitChange(categoryId)
      close()
    },
    [close, emitChange],
  )

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const pickerTitle = selectable === 'group' ? 'Wybierz grupę' : 'Wybierz kategorię'

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(true)}
        onKeyDown={handleTriggerKeyDown}
        className={[
          className ?? selectCls,
          'flex items-center justify-between gap-2 text-left w-full',
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
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </span>
      </button>

      <PickerOverlay open={open} onClose={close} title={pickerTitle}>
        <CategoryPickerContent
          categories={categories}
          selectedId={numericValue}
          direction={direction}
          selectable={selectable}
          allowQuickAdd={allowQuickAdd}
          onSelect={handleSelect}
          onCategoryCreated={onCategoryCreated}
        />
      </PickerOverlay>
    </>
  )
}
