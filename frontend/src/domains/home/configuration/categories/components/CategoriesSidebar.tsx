import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, GitMerge, Loader2, Maximize2, Minimize2, Pencil, Plus, X } from 'lucide-react'
import {
  mergeCategories,
  updateCategory,
  type Category,
} from '@/shared/api/categories'
import CategorySelect from '@/shared/components/form/CategorySelect'
import { configSelectCls } from '@/shared/components/form/formClasses'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import SidePanelShell from '@/shared/components/panel/SidePanelShell'
import { formatCategoryLabel } from '@/shared/utils/categoryOptions'
import { getApiErrorMessage } from '@/shared/utils/errors'
import type { CategoryPanel } from '../types/categoryPanel'
import { canMoveChildToParent, isMergeTarget } from '../utils/categoryTree'
import CategoryForm from './CategoryForm'

const PANEL_META: Record<
  CategoryPanel,
  { label: string; icon: typeof Plus }
> = {
  create: { label: 'Nowa kategoria', icon: Plus },
  edit: { label: 'Edycja', icon: Pencil },
  move: { label: 'Przenieś', icon: ArrowRightLeft },
  merge: { label: 'Scal', icon: GitMerge },
}

export interface CategoriesSidebarProps {
  open: boolean
  panel: CategoryPanel | null
  categoryId: number | null
  width: number
  expanded: boolean
  resizable: boolean
  onWidthChange: (w: number) => void
  onToggleExpand: () => void
  onClose: () => void
  allCategories: Category[]
  editingItem: Category | null
  editLoading: boolean
  onSaved: () => void
  onMerged: (result: { deactivatedSourceId: number }) => void
  onMoved: (updated: Category) => void
}

export default function CategoriesSidebar({
  open,
  panel,
  categoryId,
  width,
  expanded,
  resizable,
  onWidthChange,
  onToggleExpand,
  onClose,
  allCategories,
  editingItem,
  editLoading,
  onSaved,
  onMerged,
  onMoved,
}: CategoriesSidebarProps) {
  const isMobile = useIsMobile()
  const [moveParentId, setMoveParentId] = useState<number | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
  const [actionSaving, setActionSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const sourceCategory = useMemo(() => {
    if (categoryId == null) return null
    return allCategories.find((c) => c.id === categoryId) ?? null
  }, [allCategories, categoryId])

  const moveParentOptions = useMemo(() => {
    if (!sourceCategory) return []
    return allCategories.filter(
      (c) => c.active && c.parentId == null && canMoveChildToParent(sourceCategory, c),
    )
  }, [allCategories, sourceCategory])

  const mergeTargets = useMemo(() => {
    if (!sourceCategory) return []
    return allCategories.filter((c) => c.active && isMergeTarget(sourceCategory, c))
  }, [allCategories, sourceCategory])

  const mergeTargetOptions = useMemo(() => {
    if (mergeTargets.length === 0) return []
    const parentIds = new Set(
      mergeTargets.map((t) => t.parentId).filter((id): id is number => id != null),
    )
    const parents = allCategories.filter((c) => c.active && parentIds.has(c.id))
    return [...parents, ...mergeTargets]
  }, [allCategories, mergeTargets])

  useEffect(() => {
    if (!open) return
    setMoveParentId(null)
    setMergeTargetId(null)
    setActionError(null)
    setActionSaving(false)
  }, [open, panel, categoryId])

  const meta = panel ? PANEL_META[panel] : null
  const PanelIcon = meta?.icon ?? Plus
  const headerTitle =
    panel === 'edit' && editingItem
      ? `Edycja: ${editingItem.name}`
      : meta?.label ?? ''

  async function handleMove() {
    if (!sourceCategory || moveParentId == null) return
    setActionSaving(true)
    setActionError(null)
    try {
      const updated = await updateCategory(sourceCategory.id, { parentId: moveParentId })
      onMoved(updated)
      onClose()
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, 'Nie udało się przenieść kategorii.'))
    } finally {
      setActionSaving(false)
    }
  }

  async function handleMerge() {
    if (!sourceCategory || mergeTargetId == null) return
    setActionSaving(true)
    setActionError(null)
    try {
      const result = await mergeCategories(sourceCategory.id, mergeTargetId)
      onMerged({ deactivatedSourceId: result.deactivatedSourceId })
      onClose()
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, 'Nie udało się scalić kategorii.'))
    } finally {
      setActionSaving(false)
    }
  }

  function renderBody() {
    if (!panel) return null

    if (panel === 'create') {
      return (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CategoryForm
            key="create"
            item={null}
            allCategories={allCategories}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      )
    }

    if (panel === 'edit') {
      if (editLoading) {
        return (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )
      }
      if (!editingItem) {
        return (
          <div className="flex-1 px-5 py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono kategorii.</p>
          </div>
        )
      }
      return (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CategoryForm
            key={editingItem.id}
            item={editingItem}
            allCategories={allCategories}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      )
    }

    if (panel === 'move') {
      if (!sourceCategory) {
        return (
          <div className="flex-1 px-5 py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono kategorii.</p>
          </div>
        )
      }
      return (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Przenieś{' '}
              <strong className="text-gray-900 dark:text-gray-100">{sourceCategory.name}</strong>{' '}
              do innej grupy głównej.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Grupa docelowa
              </label>
              <CategorySelect
                categories={moveParentOptions}
                value={moveParentId}
                onChange={(v) => setMoveParentId(v === null || v === '' ? null : Number(v))}
                emptyLabel="— wybierz grupę —"
                selectable="group"
                disabled={actionSaving || moveParentOptions.length === 0}
                className={configSelectCls}
              />
              {moveParentOptions.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Brak grup obsługujących wszystkie kierunki tej subkategorii.
                </p>
              )}
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
          </div>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={actionSaving}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleMove()}
              disabled={actionSaving || moveParentId == null}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1c4230' }}
            >
              {actionSaving && <Loader2 size={14} className="animate-spin" />}
              Przenieś
            </button>
          </div>
        </>
      )
    }

    if (panel === 'merge') {
      if (!sourceCategory) {
        return (
          <div className="flex-1 px-5 py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Nie znaleziono kategorii.</p>
          </div>
        )
      }
      return (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Wszystkie powiązania (pozycje transakcji, szablony, reguły) z kategorii{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {formatCategoryLabel(sourceCategory)}
              </strong>{' '}
              zostaną przeniesione do wybranej kategorii docelowej. Kategoria źródłowa zostanie dezaktywowana.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Scal do
              </label>
              <CategorySelect
                categories={mergeTargetOptions}
                value={mergeTargetId}
                onChange={(v) => setMergeTargetId(v === null || v === '' ? null : Number(v))}
                emptyLabel="— wybierz subkategorię —"
                disabled={actionSaving || mergeTargets.length === 0}
                className={configSelectCls}
              />
              {mergeTargets.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Brak kompatybilnych subkategorii (docelowa musi obsługiwać te same kierunki).
                </p>
              )}
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
          </div>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={actionSaving}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => void handleMerge()}
              disabled={actionSaving || mergeTargetId == null}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1c4230' }}
            >
              {actionSaving && <Loader2 size={14} className="animate-spin" />}
              Scal
            </button>
          </div>
        </>
      )
    }

    return null
  }

  const innerContent = (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 border-[#c9a96e] text-[#c9a96e] -mb-px min-w-0">
          <PanelIcon size={13} className="shrink-0" />
          <span className="truncate">{headerTitle}</span>
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="ml-auto p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        <button
          onClick={onClose}
          className={['p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-300', isMobile ? 'ml-auto mr-3' : 'mr-3'].join(' ')}
          aria-label="Zamknij panel"
        >
          <X size={14} />
        </button>
      </div>

      {renderBody()}
    </div>
  )

  return (
    <SidePanelShell
      open={open}
      width={width}
      resizable={resizable}
      onWidthChange={onWidthChange}
      onClose={onClose}
    >
      {innerContent}
    </SidePanelShell>
  )
}
