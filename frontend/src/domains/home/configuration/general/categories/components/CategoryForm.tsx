import { useMemo, useState } from 'react'
import {
  createCategory,
  updateCategory,
  formatCategoryDeactivateError,
  type Category,
} from '@/shared/api/categories'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'

export interface CategoryFormProps {
  item: Category | null
  allCategories: Category[]
  onSaved: () => void
  onCancel: () => void
}

export default function CategoryForm({ item, allCategories, onSaved, onCancel }: CategoryFormProps) {
  const isEdit = item !== null
  const [name, setName] = useState(item?.name ?? '')
  const [parentId, setParentId] = useState<string>(item?.parentId ? String(item.parentId) : '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parentOptions = useMemo(
    () => allCategories.filter((c) => !isEdit || c.id !== item.id),
    [allCategories, isEdit, item],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
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
