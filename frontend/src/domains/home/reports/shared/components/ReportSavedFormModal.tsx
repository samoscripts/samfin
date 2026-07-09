import { useEffect, useState } from 'react'
import Modal from '@/shared/components/Modal'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import { inputCls } from '@/shared/components/form/formClasses'

export interface ReportSavedFormValues {
  name: string
  description: string
}

interface ReportSavedFormModalProps {
  open: boolean
  title: string
  initialName?: string
  initialDescription?: string
  submitLabel: string
  nameLabel?: string
  nameRequiredMessage?: string
  saveErrorMessage?: string
  onSubmit: (values: ReportSavedFormValues) => Promise<void>
  onClose: () => void
}

export default function ReportSavedFormModal({
  open,
  title,
  initialName = '',
  initialDescription = '',
  submitLabel,
  nameLabel = 'Nazwa raportu',
  nameRequiredMessage = 'Podaj nazwę raportu.',
  saveErrorMessage = 'Nie udało się zapisać raportu.',
  onSubmit,
  onClose,
}: ReportSavedFormModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setDescription(initialDescription)
    setError(null)
  }, [open, initialName, initialDescription])

  async function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(nameRequiredMessage)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({ name: trimmedName, description: description.trim() })
      onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            saveErrorMessage)
          : saveErrorMessage
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" closeDisabled={saving}>
      <div className="space-y-4">
        <label className="block text-xs text-gray-500 dark:text-gray-400">
          {nameLabel}
          <input
            type="text"
            className={[inputCls, 'mt-1'].join(' ')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
            maxLength={200}
          />
        </label>
        <label className="block text-xs text-gray-500 dark:text-gray-400">
          Opis (opcjonalnie)
          <textarea
            className={[inputCls, 'mt-1 min-h-[4.5rem] resize-y'].join(' ')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            maxLength={2000}
          />
        </label>
        {error && <FormError message={error} />}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <FormActions
            layout="modal"
            saving={saving}
            submitLabel={submitLabel}
            onCancel={onClose}
          />
        </form>
      </div>
    </Modal>
  )
}
