import { useEffect, useState } from 'react'
import { ChevronRight, Loader2, Pencil, Plus, X } from 'lucide-react'
import {
  deactivateCategory,
  fetchCategories,
  type Category,
  type CategoryType,
} from '@/shared/api/categories'
import Pill from '@/shared/components/Pill'
import { CATEGORY_TYPE_PILL } from '@/shared/constants/pillMaps'
import CategoryForm from '../components/CategoryForm'

type View = 'list' | 'create' | 'edit'

const TYPE_LABEL: Record<CategoryType, string> = {
  EXPENSE: 'Wydatek',
  INCOME: 'Wpływ',
}

export default function Categories() {
  const [view, setView] = useState<View>('list')
  const [items, setItems] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  async function loadCategories() {
    setIsLoading(true)
    try {
      setItems(await fetchCategories())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'list') {
      loadCategories()
    }
  }, [view])

  function openCreate() {
    setEditingItem(null)
    setView('create')
  }

  function openEdit(item: Category) {
    setEditingItem(item)
    setView('edit')
  }

  function backToList() {
    setEditingItem(null)
    setView('list')
  }

  async function handleDeactivate(item: Category) {
    if (!confirm(`Dezaktywować kategorię „${item.name}”?`)) return
    setDeactivating(item.id)
    try {
      await deactivateCategory(item.id)
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: false } : i)))
    } finally {
      setDeactivating(null)
    }
  }

  const active = items.filter((i) => i.active)
  const inactive = items.filter((i) => !i.active)

  const breadcrumb = (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button onClick={backToList} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        Kategorie
      </button>
      {view !== 'list' && (
        <>
          <ChevronRight size={12} className="shrink-0" />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {view === 'create' ? 'Nowa kategoria' : `Edycja: ${editingItem?.name ?? ''}`}
          </span>
        </>
      )}
    </nav>
  )

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        {breadcrumb}
        <div className="w-full space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {view === 'create' ? 'Nowa kategoria' : `Edycja: ${editingItem?.name ?? ''}`}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <CategoryForm
              item={editingItem}
              allCategories={items}
              onSaved={backToList}
              onCancel={backToList}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {breadcrumb}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kategorie</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Kategorie przychodów i wydatków z opcjonalną kategorią nadrzędną.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nowa kategoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Brak kategorii. Kliknij „Nowa kategoria”, aby dodać pierwszą.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <CategoryTable
            title="Aktywne"
            items={active}
            deactivating={deactivating}
            onEdit={openEdit}
            onDeactivate={handleDeactivate}
          />
          {inactive.length > 0 && (
            <CategoryTable
              title="Nieaktywne"
              items={inactive}
              deactivating={deactivating}
              onEdit={openEdit}
              onDeactivate={handleDeactivate}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface CategoryTableProps {
  title: string
  items: Category[]
  deactivating: number | null
  onEdit: (item: Category) => void
  onDeactivate: (item: Category) => void
}

function CategoryTable({ title, items, deactivating, onEdit, onDeactivate }: CategoryTableProps) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
        {title}
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Nazwa</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Typ</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Nadrzędna</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Opis</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Pill variant={CATEGORY_TYPE_PILL[item.type]}>{TYPE_LABEL[item.type]}</Pill>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{item.parentName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">{item.description ?? '—'}</td>
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
                          {deactivating === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Pill variant={CATEGORY_TYPE_PILL[item.type]}>{TYPE_LABEL[item.type]}</Pill>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Nadrzędna: {item.parentName ?? '—'}</span>
                  </div>
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
