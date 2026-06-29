import { useEffect, useMemo, useState } from 'react'
import { createCategory, type Category } from '@/shared/api/categories'
import Select from '@/shared/components/form/Select'
import { btnSecondary, configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { filterActiveCategories } from '@/shared/utils/categoryOptions'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface CategoryQuickAddFormProps {
  categories: Category[]
  initialName?: string
  onCreated: (category: Category) => void | Promise<void>
  onCancel: () => void
}

export default function CategoryQuickAddForm({
  categories,
  initialName = '',
  onCreated,
  onCancel,
}: CategoryQuickAddFormProps) {
  const [name, setName] = useState(initialName)
  const [parentId, setParentId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parentOptions = useMemo(
    () =>
      filterActiveCategories(categories)
        .filter((c) => c.parentId == null)
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [categories],
  )

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  useEffect(() => {
    if (parentId === '') {
      setParentId(parentOptions[0]?.id ?? '')
      return
    }
    if (!parentOptions.some((p) => p.id === parentId)) {
      setParentId(parentOptions[0]?.id ?? '')
    }
  }, [parentId, parentOptions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Podaj nazwę subkategorii.')
      return
    }
    if (parentId === '') {
      setError('Wybierz kategorię główną.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const category = await createCategory({
        name: trimmed,
        parentId: Number(parentId),
        description: null,
        active: true,
      })
      await onCreated(category)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się dodać kategorii.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-1">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nowa subkategoria</p>
      <input
        type="text"
        className={configInputCls}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa subkategorii"
        autoFocus
        disabled={saving}
      />
      <Select
        className={configSelectCls}
        value={parentId === '' ? '' : String(parentId)}
        onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}
        disabled={saving}
      >
        <option value="">— kategoria główna —</option>
        {parentOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      {parentOptions.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Brak kategorii głównych — dodaj grupę w konfiguracji.
        </p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          className={[btnSecondary, 'flex-1 py-2 text-xs'].join(' ')}
          onClick={onCancel}
          disabled={saving}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="flex-1 py-2 text-xs font-medium rounded-lg text-white bg-[#1c4230] hover:opacity-90 disabled:opacity-50"
          disabled={saving || parentOptions.length === 0}
        >
          {saving ? 'Zapisywanie…' : 'Dodaj'}
        </button>
      </div>
    </form>
  )
}
