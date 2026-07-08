import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { PanelRight } from 'lucide-react'
import { useRightPanelPortal } from '@/layout/RightPanelContext'

interface ReportPageShellProps {
  sidebarOpen: boolean
  onOpenSidebar: () => void
  onCloseSidebar: () => void
  filterCount: number
  sidebar?: ReactNode
  children: ReactNode
  sidebarButtonLabel?: string
}

export default function ReportPageShell({
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  filterCount,
  sidebar,
  children,
  sidebarButtonLabel = 'Filtry i okres',
}: ReportPageShellProps) {
  const portalRoot = useRightPanelPortal()

  return (
    <>
      <div className="flex flex-col md:h-full md:overflow-hidden -mx-4 md:-mx-6">
        <div className="flex items-center justify-end px-4 md:px-6 pb-3 shrink-0">
          <button
            type="button"
            onClick={sidebarOpen ? onCloseSidebar : onOpenSidebar}
            className={[
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm',
              sidebarOpen
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            ].join(' ')}
            aria-label="Filtry i okres"
          >
            <PanelRight size={15} />
            {sidebarButtonLabel}
            {filterCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                style={{ backgroundColor: '#c9a96e' }}
              >
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 px-4 md:px-6 pb-6 overflow-y-auto md:overflow-visible">
          {children}
        </div>
      </div>

      {portalRoot && sidebar ? createPortal(sidebar, portalRoot) : null}
    </>
  )
}
