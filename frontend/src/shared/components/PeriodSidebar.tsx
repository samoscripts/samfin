import { type RefObject } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import PeriodPanelForm, { type PeriodRangePreset } from '@/shared/components/PeriodPanelForm'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export type { PeriodRangePreset }

const PANEL_WIDTH = 420

export interface PeriodSidebarProps {
  open: boolean
  onClose: () => void
  year: number
  month: number
  dateFrom: string
  dateTo: string
  isCustomRange: boolean
  rangePresets?: PeriodRangePreset[]
  onApplyMonth: (year: number, month: number) => void
  onApplyRange: (dateFrom: string, dateTo: string) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

export default function PeriodSidebar({
  open,
  onClose,
  year,
  month,
  dateFrom,
  dateTo,
  isCustomRange,
  rangePresets,
  onApplyMonth,
  onApplyRange,
  returnFocusRef,
}: PeriodSidebarProps) {
  const isMobile = useIsMobile()

  const finishClose = () => {
    returnFocusRef?.current?.focus()
    onClose()
  }

  const header = (
    <div className="flex items-center gap-2 shrink-0 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
      <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
        Wybór okresu
      </h2>
      <button
        type="button"
        onClick={finishClose}
        className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )

  const body = (
    <PeriodPanelForm
      year={year}
      month={month}
      dateFrom={dateFrom}
      dateTo={dateTo}
      isCustomRange={isCustomRange}
      rangePresets={rangePresets}
      onApplyMonth={onApplyMonth}
      onApplyRange={onApplyRange}
    />
  )

  const inner = (
    <div className="flex flex-col h-full min-h-0">
      {header}
      <div className="flex flex-col flex-1 min-h-0">{body}</div>
    </div>
  )

  if (isMobile) {
    if (!open) return null

    return (
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex flex-col',
          'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
        ].join(' ')}
        style={{ width: 'min(100vw, 28rem)' }}
      >
        {inner}
      </aside>
    )
  }

  return (
    <aside
      className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: open ? PANEL_WIDTH : 0 }}
    >
      {open && (
        <div className="flex flex-col h-full min-h-0" style={{ width: PANEL_WIDTH }}>
          {inner}
        </div>
      )}
    </aside>
  )
}
