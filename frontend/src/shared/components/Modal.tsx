import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export type ModalSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  titleId?: string
  size?: ModalSize
  zIndexClass?: string
  closeDisabled?: boolean
  showCloseButton?: boolean
  panelClassName?: string
  children: React.ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  titleId = 'modal-title',
  size = 'lg',
  zIndexClass = 'z-50',
  closeDisabled = false,
  showCloseButton = true,
  panelClassName = '',
  children,
}: ModalProps) {
  if (!open) return null

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4`}>
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={closeDisabled ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={[
          'relative w-full max-h-[90vh] overflow-y-auto',
          SIZE_CLASS[size],
          'bg-white dark:bg-gray-900 rounded-xl shadow-xl',
          'border border-gray-200 dark:border-gray-800 p-5',
          panelClassName,
        ].join(' ')}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title ? (
              <h3
                id={titleId}
                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h3>
            ) : (
              <span />
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
