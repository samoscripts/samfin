import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '@/shared/components/Modal'

export interface ApplyClassificationRulesDialogProps {
  open: boolean
  title: string
  message: string
  loading?: boolean
  onConfirm: (overwrite: boolean) => void
  onCancel: () => void
}

export default function ApplyClassificationRulesDialog({
  open,
  title,
  message,
  loading = false,
  onConfirm,
  onCancel,
}: ApplyClassificationRulesDialogProps) {
  const [overwrite, setOverwrite] = useState(false)

  useEffect(() => {
    if (open) setOverwrite(false)
  }, [open])

  return (
    <Modal
      open={open}
      title={title}
      titleId="apply-rules-dialog-title"
      onClose={onCancel}
      closeDisabled={loading}
      showCloseButton={false}
      size="md"
      zIndexClass="z-[60]"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>

      <label className="mt-4 flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 dark:border-gray-600"
          disabled={loading}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Nadpisz istniejącą klasyfikację (domyślnie uzupełnia tylko puste pola)
        </span>
      </label>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(overwrite)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1c4230' }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Zastosuj reguły
        </button>
      </div>
    </Modal>
  )
}
