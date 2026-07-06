import type { ReactNode } from 'react'
import { formatAmount } from '@/shared/utils/format'

export interface ChartHoverPayload {
  label: string
  value: number
  hint?: string
}

interface ChartHoverPanelProps {
  payload: ChartHoverPayload | null
  emptyLabel?: string
  children: ReactNode
  className?: string
}

export default function ChartHoverPanel({
  payload,
  emptyLabel = 'Najedź na element wykresu',
  children,
  className,
}: ChartHoverPanelProps) {
  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <div
        className="absolute top-2 right-2 z-10 pointer-events-none min-w-[7rem] max-w-[14rem] px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-sm backdrop-blur-sm"
        aria-live="polite"
      >
        {payload ? (
          <>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight">
              {payload.label}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
              {formatAmount(payload.value)}
            </p>
            {payload.hint && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {payload.hint}
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{emptyLabel}</p>
        )}
      </div>
      {children}
    </div>
  )
}
