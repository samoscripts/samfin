import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Loader2, ChevronRight } from 'lucide-react'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimpleEntity {
  id: number
  name: string
  description: string | null
  active: boolean
}

export interface SelectOption {
  value: string
  label: string
  badgeCls?: string
}

export interface ExtraField {
  key: string
  label: string
  options: SelectOption[]
  defaultValue: string
  required?: boolean
}

export interface SimpleEntityPageProps<T extends SimpleEntity> {
  entityLabel: string
  addLabel: string
  editLabel: (item: T) => string
  description: string
  fetchAll: () => Promise<T[]>
  create: (payload: Record<string, unknown>) => Promise<T>
  update: (id: number, payload: Record<string, unknown>) => Promise<T>
  deactivate: (id: number) => Promise<void>
  extraFields?: ExtraField[]
  deactivateConfirm?: (item: T) => string
  notFoundName?: string
}

// ---------------------------------------------------------------------------
// Inline form
// ---------------------------------------------------------------------------

interface FormProps<T extends SimpleEntity> {
  item: T | null
  extraFields: ExtraField[]
  onSaved: (saved: T) => void
  onCancel: () => void
  create: (payload: Record<string, unknown>) => Promise<T>
  update: (id: number, payload: Record<string, unknown>) => Promise<T>
  entityLabel: string
}

function EntityForm<T extends SimpleEntity>({
  item,
  extraFields,
  onSaved,
  onCancel,
  create,
  update,
  entityLabel,
}: FormProps<T>) {
  const isEdit = item !== null

  const initialExtra: Record<string, string> = {}
  for (const f of extraFields) {
    initialExtra[f.key] = ((item as Record<string, unknown> | null)?.[f.key] as string | undefined) ?? f.defaultValue
  }

  const [name, setName]               = useState(item?.name ?? '')
  const [description, setDescription] = useState((item?.description as string) ?? '')
  const [active, setActive]           = useState(item?.active ?? true)
  const [extra, setExtra]             = useState<Record<string, string>>(initialExtra)
  const [error, setError]             = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        active,
        ...extra,
      }
      const saved = isEdit ? await update(item!.id, payload) : await create(payload)
      onSaved(saved)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Wystąpił błąd podczas zapisywania.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <div className={extraFields.length > 0 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
        <FormField label="Nazwa" required>
          <input
            type="text"
            className={configInputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nazwa ${entityLabel.toLowerCase()}…`}
            required
          />
        </FormField>

        {extraFields.map((field) => (
          <FormField key={field.key} label={field.label} required={field.required}>
            <Select
              className={configSelectCls}
              value={extra[field.key]}
              onChange={(e) => setExtra((prev) => ({ ...prev, [field.key]: e.target.value }))}
              required={field.required}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>
        ))}
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
            id="entity-active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-[#c9a96e]"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label htmlFor="entity-active" className="text-sm text-gray-700 dark:text-gray-300">
            Aktywny
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SimpleEntityPage<T extends SimpleEntity>({
  entityLabel,
  addLabel,
  editLabel,
  description,
  fetchAll,
  create,
  update,
  deactivate,
  extraFields = [],
  deactivateConfirm,
}: SimpleEntityPageProps<T>) {
  type View = 'list' | 'create' | 'edit'

  const [items, setItems]             = useState<T[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [view, setView]               = useState<View>('list')
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  useEffect(() => {
    if (view === 'list') {
      setIsLoading(true)
      fetchAll().then(setItems).finally(() => setIsLoading(false))
    }
  }, [view])

  function openEdit(item: T) { setEditingItem(item); setView('edit') }
  function openCreate()       { setEditingItem(null); setView('create') }
  function backToList()       { setEditingItem(null); setView('list') }

  async function handleDeactivate(item: T) {
    const msg = deactivateConfirm
      ? deactivateConfirm(item)
      : `Dezaktywować „${item.name}"?`
    if (!confirm(msg)) return
    setDeactivating(item.id)
    try {
      await deactivate(item.id)
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: false } : i)))
    } finally {
      setDeactivating(null)
    }
  }

  function handleSaved(saved: T) {
    if (view === 'create') {
      backToList()
    } else {
      setEditingItem(saved)
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id)
        if (idx < 0) return prev
        const next = [...prev]
        next[idx] = saved
        return next
      })
    }
  }

  // Breadcrumb
  const breadcrumb = (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button onClick={backToList} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        {entityLabel}
      </button>
      {view !== 'list' && (
        <>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {view === 'create' ? addLabel : editLabel(editingItem!)}
          </span>
        </>
      )}
    </nav>
  )

  // ---- Create / Edit ----
  if (view === 'create' || view === 'edit') {
    return (
      <div>
        {breadcrumb}
        <div className="w-full space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {view === 'create' ? addLabel : editLabel(editingItem!)}
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <EntityForm
              item={editingItem}
              extraFields={extraFields}
              onSaved={handleSaved}
              onCancel={backToList}
              create={create}
              update={update}
              entityLabel={entityLabel}
            />
          </div>
        </div>
      </div>
    )
  }

  // ---- List ----
  const active   = items.filter((i) => i.active)
  const inactive = items.filter((i) => !i.active)

  return (
    <div>
      {breadcrumb}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{entityLabel}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          {addLabel}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Brak rekordów. Kliknij „{addLabel}", aby dodać pierwszy.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <EntityTable
            items={active}
            title="Aktywne"
            extraFields={extraFields}
            onEdit={openEdit}
            onDeactivate={handleDeactivate}
            deactivating={deactivating}
          />
          {inactive.length > 0 && (
            <EntityTable
              items={inactive}
              title="Nieaktywne"
              extraFields={extraFields}
              onEdit={openEdit}
              onDeactivate={handleDeactivate}
              deactivating={deactivating}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table sub-component
// ---------------------------------------------------------------------------

interface TableProps<T extends SimpleEntity> {
  items: T[]
  title: string
  extraFields: ExtraField[]
  onEdit: (item: T) => void
  onDeactivate: (item: T) => void
  deactivating: number | null
}

function EntityTable<T extends SimpleEntity>({
  items,
  title,
  extraFields,
  onEdit,
  onDeactivate,
  deactivating,
}: TableProps<T>) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
        {title}
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Nazwa</th>
                {extraFields.map((f) => (
                  <th key={f.key} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Opis</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {item.name}
                  </td>
                  {extraFields.map((f) => {
                    const val = (item as Record<string, unknown>)[f.key] as string | undefined
                    const opt = f.options.find((o) => o.value === val)
                    return (
                      <td key={f.key} className="px-4 py-3 whitespace-nowrap">
                        {opt ? (
                          opt.badgeCls ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.badgeCls}`}>
                              {opt.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 dark:text-gray-400">{opt.label}</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                    {item.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(item)}
                        title="Edytuj"
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {item.active && (
                        <button
                          onClick={() => onDeactivate(item)}
                          disabled={deactivating === item.id}
                          title="Dezaktywuj"
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                        >
                          {deactivating === item.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <X size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  {extraFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                    {extraFields.map((f) => {
                      const val = (item as Record<string, unknown>)[f.key] as string | undefined
                      const opt = f.options.find((o) => o.value === val)
                      return opt ? (
                        opt.badgeCls ? (
                          <span key={f.key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.badgeCls}`}>
                            {opt.label}
                          </span>
                        ) : (
                          <span key={f.key} className="text-xs text-gray-500">{opt.label}</span>
                        )
                      ) : null
                    })}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(item)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  {item.active && (
                    <button
                      onClick={() => onDeactivate(item)}
                      disabled={deactivating === item.id}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {deactivating === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
