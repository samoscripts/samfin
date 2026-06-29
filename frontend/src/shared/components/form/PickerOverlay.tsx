import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export interface PickerOverlayProps {
  open: boolean
  onClose: () => void
  title: string
  titleId?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function PickerOverlay({
  open,
  onClose,
  title,
  titleId = 'picker-overlay-title',
  children,
  footer,
}: PickerOverlayProps) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const header = (
    <div className="flex items-center justify-between gap-3 shrink-0 px-4 pt-4 pb-2">
      <h3 id={titleId} className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
        aria-label="Zamknij"
      >
        <X size={18} />
      </button>
    </div>
  )

  const body = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {header}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">{children}</div>
      {footer && (
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          {footer}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-black/40 dark:bg-black/60"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={[
            'relative flex flex-col w-full h-[85dvh]',
            'bg-white dark:bg-gray-900 rounded-t-xl shadow-xl',
            'border border-gray-200 dark:border-gray-800 border-b-0',
          ].join(' ')}
        >
          {body}
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative flex flex-col w-full max-w-lg h-[min(85vh,32rem)]',
          'bg-white dark:bg-gray-900 rounded-xl shadow-xl',
          'border border-gray-200 dark:border-gray-800',
        ].join(' ')}
      >
        {body}
      </div>
    </div>,
    document.body,
  )
}
