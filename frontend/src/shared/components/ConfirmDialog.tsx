import { Loader2 } from 'lucide-react'
import Modal from '@/shared/components/Modal'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      titleId="confirm-dialog-title"
      onClose={onCancel}
      closeDisabled={loading}
      showCloseButton={false}
      size="sm"
      zIndexClass="z-[60]"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1c4230' }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
