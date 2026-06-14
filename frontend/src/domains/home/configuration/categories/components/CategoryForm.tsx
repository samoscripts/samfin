import { useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  updateCategory,
  type Category,
  type CategoryType,
} from '@/shared/api/categories'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface CategoryFormProps {
  item: Category | null
  allCategories: Category[]
  onSaved: () => void
  onCancel: () => void
}

export default function CategoryForm({ item, allCategories, onSaved, onCancel }: CategoryFormProps) {
  const isEdit = item !== null
  const [name, setName] = useState(item?.name ?? '')
  const [type, setType] = useState<CategoryType>(item?.type ?? 'EXPENSE')
  const [parentId, setParentId] = useState<string>(item?.parentId ? String(item.parentId) : '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parentOptions = useMemo(
    () =>
      allCategories.filter((c) => {
        if (c.type !== type) return false
        if (isEdit && c.id === item.id) return false
        return true
      }),
    [allCategories, type, isEdit, item],
  )

  useEffect(() => {
    if (parentId === '') return
    const selected = allCategories.find((c) => c.id === Number(parentId))
    if (!selected) {
      setParentId('')
      return
    }
    if (selected.type !== type) {
      setParentId('')
    }
  }, [type, parentId, allCategories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
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
      setError(getApiErrorMessage(err, 'Wystąpił błąd podczas zapisywania kategorii.'))
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

        <FormField label="Typ" required>
          <Select
            className={configSelectCls}
            value={type}
            onChange={(e) => setType(e.target.value as CategoryType)}
            required
          >
            <option value="EXPENSE">Wydatek</option>
            <option value="INCOME">Wpływ</option>
          </Select>
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
