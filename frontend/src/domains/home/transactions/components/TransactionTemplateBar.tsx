import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import type { Direction } from '@/shared/types'
import type { TransactionTemplate, TransactionTemplatePayload } from '@/shared/api/transactionTemplates'
import {
  createTransactionTemplate,
  deleteTransactionTemplate,
  fetchTransactionTemplates,
} from '@/shared/api/transactionTemplates'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import { btnSecondary, inputCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface TransactionTemplateListProps {
  direction: Direction
  onApply: (template: TransactionTemplate) => void
  refreshKey?: number
}

export function TransactionTemplateList({
  direction,
  onApply,
  refreshKey = 0,
}: TransactionTemplateListProps) {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TransactionTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchTransactionTemplates(direction)
      setTemplates(list)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się załadować szablonów.'))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [direction])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates, refreshKey])

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTransactionTemplate(deleteTarget.id)
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się usunąć szablonu.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-1">
        <Loader2 size={14} className="animate-spin" />
        Ładowanie szablonów…
      </div>
    )
  }

  if (!loading && templates.length === 0 && !error) {
    return null
  }

  return (
    <>
      {error && <FormError message={error} />}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <div key={template.id} className="inline-flex items-stretch">
              <button
                type="button"
                onClick={() => onApply(template)}
                className={[btnSecondary, 'px-3 py-1.5 text-xs rounded-r-none border-r-0'].join(' ')}
              >
                {template.name}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(template)}
                aria-label={`Usuń szablon ${template.name}`}
                className={[
                  btnSecondary,
                  'px-1.5 py-1.5 text-xs rounded-l-none text-gray-400 hover:text-red-500 dark:hover:text-red-400',
                ].join(' ')}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usuń szablon"
        message={
          deleteTarget
            ? `Czy na pewno usunąć szablon „${deleteTarget.name}"? Tej operacji nie można cofnąć.`
            : ''
        }
        confirmLabel="Usuń"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </>
  )
}

export interface TransactionTemplateFormFooterProps {
  saving: boolean
  submitLabel: string
  submitDisabled?: boolean
  onCancel: () => void
  getTemplatePayload: () => Omit<TransactionTemplatePayload, 'name'>
  onTemplateCreated?: () => void
}

export function TransactionTemplateFormFooter({
  saving,
  submitLabel,
  submitDisabled = false,
  onCancel,
  getTemplatePayload,
  onTemplateCreated,
}: TransactionTemplateFormFooterProps) {
  const [adding, setAdding] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancelAdding() {
    setAdding(false)
    setTemplateName('')
    setError(null)
  }

  async function handleSaveTemplate() {
    const name = templateName.trim()
    if (!name) {
      setError('Podaj nazwę szablonu.')
      return
    }

    setSavingTemplate(true)
    setError(null)
    try {
      await createTransactionTemplate({ name, ...getTemplatePayload() })
      cancelAdding()
      onTemplateCreated?.()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się zapisać szablonu.'))
    } finally {
      setSavingTemplate(false)
    }
  }

  const formBusy = saving || savingTemplate

  return (
    <div className="space-y-3">
      {adding && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            className={[inputCls, 'flex-1'].join(' ')}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Podaj nazwę"
            disabled={savingTemplate}
            autoFocus
          />
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleSaveTemplate()}
              disabled={savingTemplate}
              className={[btnSecondary, 'px-3 py-2 text-xs'].join(' ')}
            >
              {savingTemplate && <Loader2 size={14} className="animate-spin inline mr-1" />}
              Zapisz szablon
            </button>
            <button
              type="button"
              onClick={cancelAdding}
              disabled={savingTemplate}
              className={[btnSecondary, 'px-3 py-2 text-xs'].join(' ')}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {error && <FormError message={error} />}

      <FormActions
        saving={formBusy}
        submitLabel={submitLabel}
        submitDisabled={submitDisabled}
        onCancel={onCancel}
        middleActions={
          !adding ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true)
                setError(null)
              }}
              disabled={formBusy}
              className={[btnSecondary, 'px-3 py-2 text-xs'].join(' ')}
            >
              Dodaj szablon
            </button>
          ) : undefined
        }
      />
    </div>
  )
}
