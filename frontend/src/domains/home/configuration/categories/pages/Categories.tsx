import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'
import {
  deactivateCategory,
  fetchCategories,
  fetchCategory,
  formatCategoryDeactivateError,
  type Category,
} from '@/shared/api/categories'
import { useRightPanelPortal } from '@/layout/RightPanelContext'
import CategoriesSidebar from '../components/CategoriesSidebar'
import CategoryTreeList from '../components/CategoryTreeList'
import {
  computeExpandedPanelWidth,
  loadStoredCategoriesPanelWidth,
  storeCategoriesPanelWidth,
} from '../constants/panelLayout'
import { useCategoriesPanelUrl } from '../hooks/useCategoriesPanelUrl'

export default function Categories() {
  const portalRoot = useRightPanelPortal()
  const { panel, categoryId, panelOpen, openPanel, closePanel } = useCategoriesPanelUrl()

  const [items, setItems] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deactivating, setDeactivating] = useState<number | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const [panelWidth, setPanelWidth] = useState(loadStoredCategoriesPanelWidth)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const effectivePanelWidth = panelExpanded ? computeExpandedPanelWidth() : panelWidth

  const loadItems = useCallback(() => {
    setIsLoading(true)
    fetchCategories()
      .then(setItems)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    if (panel !== 'edit' || categoryId === null) {
      setEditingItem(null)
      return
    }

    const fromList = items.find((i) => i.id === categoryId)
    if (fromList) {
      setEditingItem(fromList)
      return
    }

    let cancelled = false
    setEditLoading(true)
    fetchCategory(categoryId)
      .then((item) => {
        if (!cancelled) setEditingItem(item)
      })
      .catch(() => {
        if (!cancelled) setEditingItem(null)
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [panel, categoryId, items])

  const handlePanelWidthChange = useCallback((w: number) => {
    setPanelWidth(w)
    storeCategoriesPanelWidth(w)
  }, [])

  async function handleDeactivate(item: Category) {
    if (!confirm(`Dezaktywować kategorię „${item.name}"?`)) return
    setDeactivateError(null)
    setDeactivating(item.id)
    try {
      await deactivateCategory(item.id)
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: false } : i)))
    } catch (err: unknown) {
      setDeactivateError(formatCategoryDeactivateError(err, 'Nie udało się dezaktywować kategorii.'))
    } finally {
      setDeactivating(null)
    }
  }

  function handleSaved() {
    closePanel()
    loadItems()
  }

  function handleMerged({ deactivatedSourceId }: { deactivatedSourceId: number }) {
    setItems((prev) =>
      prev.map((c) => (c.id === deactivatedSourceId ? { ...c, active: false } : c)),
    )
  }

  function handleMoved(updated: Category) {
    setItems((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    )
  }

  const active = items.filter((i) => i.active)
  const inactive = items.filter((i) => !i.active)

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kategorie</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Grupy i subkategorie — przeciągnij subkategorię na grupę, aby przenieść.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPanel('create')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Nowa kategoria
          </button>
        </div>

        {deactivateError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{deactivateError}</p>
        )}

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
            <CategoryTreeList
              title="Aktywne"
              items={active}
              deactivating={deactivating}
              onEdit={(id) => openPanel('edit', id)}
              onDeactivate={handleDeactivate}
              onMerge={(item) => openPanel('merge', item.id)}
              onMove={(item) => openPanel('move', item.id)}
              onItemsChange={setItems}
            />
            {inactive.length > 0 && (
              <CategoryTreeList
                title="Nieaktywne"
                items={inactive}
                dimmed
                deactivating={deactivating}
                onEdit={(id) => openPanel('edit', id)}
                onDeactivate={handleDeactivate}
                onMerge={(item) => openPanel('merge', item.id)}
                onMove={(item) => openPanel('move', item.id)}
                onItemsChange={setItems}
              />
            )}
          </div>
        )}
      </div>

      {portalRoot &&
        createPortal(
          <CategoriesSidebar
            open={panelOpen}
            panel={panel}
            categoryId={categoryId}
            width={effectivePanelWidth}
            expanded={panelExpanded}
            resizable={!panelExpanded}
            onWidthChange={handlePanelWidthChange}
            onToggleExpand={() => setPanelExpanded((v) => !v)}
            onClose={closePanel}
            allCategories={items}
            editingItem={editingItem}
            editLoading={editLoading}
            onSaved={handleSaved}
            onMerged={handleMerged}
            onMoved={handleMoved}
          />,
          portalRoot,
        )}
    </>
  )
}
