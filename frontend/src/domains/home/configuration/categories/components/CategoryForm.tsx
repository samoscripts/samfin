import { useEffect, useMemo, useState } from 'react'
import { DIRECTION_OPTIONS } from '@/domains/home/transactions/constants/labels'
import {
  createCategory,
  updateCategory,
  formatCategoryDeactivateError,
  type Category,
  type CategoryDirection,
} from '@/shared/api/categories'
import FilterToggleGroup from '@/shared/components/form/FilterToggleGroup'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import { parentSupportsChildDirections } from '@/shared/utils/categoryOptions'

export interface CategoryFormProps {
  item: Category | null
  allCategories: Category[]
  onSaved: () => void
  onCancel: () => void
}

function defaultDirections(item: Category | null): CategoryDirection[] {
  if (item?.directions?.length) return item.directions
  return ['EXPENSE']
}

export default function CategoryForm({ item, allCategories, onSaved, onCancel }: CategoryFormProps) {
  const isEdit = item !== null
  const [name, setName] = useState(item?.name ?? '')
  const [directions, setDirections] = useState<CategoryDirection[]>(() => defaultDirections(item))
  const [parentId, setParentId] = useState<string>(item?.parentId ? String(item.parentId) : '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parentOptions = useMemo(
    () =>
      allCategories.filter((c) => {
        if (isEdit && c.id === item.id) return false
        return parentSupportsChildDirections(c, directions)
      }),
    [allCategories, directions, isEdit, item],
  )

  useEffect(() => {
    if (parentId === '') return
    const selected = allCategories.find((c) => c.id === Number(parentId))
    if (!selected || !parentSupportsChildDirections(selected, directions)) {
      setParentId('')
    }
  }, [directions, parentId, allCategories])

  function handleDirectionsChange(next: string[]) {
    if (next.length === 0) return
    setDirections(next as CategoryDirection[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (directions.length === 0) {
      setError('Wybierz co najmniej jeden kierunek (wydatek lub wpływ).')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        directions,
        parentId: parentId ? Number(parentId) : null,
        description: description.trim() || null,
        active,
      }

      if (isEdit) {
        await updateCategory(item.id, payload)
      } else {
        await createCategory(payload)
      }
      onSaved()
    } catch (err: unknown) {
      setError(formatCategoryDeactivateError(err, 'Wystąpił błąd podczas zapisywania kategorii.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Nazwa" required>
          <input
            type="text"
            className={configInputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa kategorii…"
            required
          />
        </FormField>

        <FormField label="Kierunki" required>
          <FilterToggleGroup
            options={DIRECTION_OPTIONS}
            value={directions}
            onChange={handleDirectionsChange}
            variantForValue={(v) => DIRECTION_PILL[v as CategoryDirection]}
            ariaLabel="Kierunki kategorii"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Kategoria nadrzędna">
          <DictionarySelect
            items={parentOptions}
            value={parentId ? Number(parentId) : null}
            onChange={(v) => setParentId(v === null ? '' : String(v))}
            emptyLabel="Brak"
            valueType="number"
            className={configSelectCls}
          />
        </FormField>
      </div>

      <FormField label="Opis">
        <textarea
          className={textareaCls}
          rows={3}
          placeholder="Opcjonalny opis…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="category-active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-[#c9a96e]"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label htmlFor="category-active" className="text-sm text-gray-700 dark:text-gray-300">
            Aktywna
          </label>
        </div>
      )}

      <FormActions
        saving={saving}
        submitLabel={isEdit ? 'Zapisz zmiany' : 'Dodaj'}
        onCancel={onCancel}
      />
    </form>
  )
}
