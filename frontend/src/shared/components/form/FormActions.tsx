import { Loader2 } from 'lucide-react'
import { btnPrimary, btnPrimaryModal, btnSecondary, btnSecondaryModal } from './formClasses'

export interface FormActionsProps {
  saving: boolean
  submitLabel: string
  savingLabel?: string
  cancelLabel?: string
  onCancel: () => void
  hideCancel?: boolean
  layout?: 'row' | 'modal'
  className?: string
  submitDisabled?: boolean
}

export default function FormActions({
  saving,
  submitLabel,
  savingLabel = 'Zapisywanie…',
  cancelLabel = 'Anuluj',
  onCancel,
  hideCancel = false,
  layout = 'row',
  className,
  submitDisabled = false,
}: FormActionsProps) {
  const isModal = layout === 'modal'

  return (
    <div
      className={[
        isModal ? 'flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800' : 'flex items-center gap-3 pt-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hideCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={isModal ? btnSecondaryModal : btnSecondary}
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={saving || submitDisabled}
        className={isModal ? btnPrimaryModal : btnPrimary}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  )
}
