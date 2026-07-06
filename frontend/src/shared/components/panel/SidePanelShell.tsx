import type { ReactNode } from 'react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import {
  clampPanelWidth,
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
} from '@/shared/components/panel/panelLayout'

export interface SidePanelBackdrop {
  onClick: () => void
  /** Desktop: dim only the area left of the panel (transactions edit mode). */
  desktopInset?: boolean
}

export interface SidePanelShellProps {
  open: boolean
  width: number
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (width: number) => void
  onClose: () => void
  backdrop?: SidePanelBackdrop | null
  children: ReactNode
}

export default function SidePanelShell({
  open,
  width,
  resizable = true,
  minWidth = MIN_PANEL_WIDTH,
  maxWidth = MAX_PANEL_WIDTH,
  onWidthChange,
  backdrop,
  children,
}: SidePanelShellProps) {
  const isMobile = useIsMobile()

  const startResize = (e: React.MouseEvent) => {
    if (!resizable || !onWidthChange) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMouseMove = (mv: MouseEvent) => {
      onWidthChange(
        clampPanelWidth(startWidth + (startX - mv.clientX), minWidth, maxWidth),
      )
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const backdropEl = backdrop ? (
    isMobile ? (
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={backdrop.onClick}
        aria-hidden="true"
      />
    ) : backdrop.desktopInset ? (
      <div
        className="fixed inset-y-0 left-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300"
        style={{ right: width }}
        onClick={backdrop.onClick}
        aria-hidden="true"
      />
    ) : null
  ) : null

  if (isMobile) {
    return (
      <>
        {backdropEl}
        <aside
          className={[
            'fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col',
            'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
            'transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >
          {children}
        </aside>
      </>
    )
  }

  return (
    <>
      {backdropEl}
      <aside
        className="relative z-50 h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{ width: open ? width : 0 }}
      >
        {open && resizable && onWidthChange && (
          <div
            className="absolute left-0 inset-y-0 w-1.5 cursor-col-resize z-10 group"
            onMouseDown={startResize}
          >
            <div className="h-full w-px ml-0.5 bg-transparent group-hover:bg-[#c9a96e]/40 transition-colors" />
          </div>
        )}
        <div className="flex flex-col h-full min-h-0" style={{ width }}>
          {children}
        </div>
      </aside>
    </>
  )
}
