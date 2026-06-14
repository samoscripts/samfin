import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, MessageSquareText } from 'lucide-react'

interface ListTextTooltipProps {
  text: string | null | undefined
  className?: string
  lines?: 1 | 2
  emptyLabel?: string
}

/** Cuts overflow without CSS ellipsis (…) — only the action icon opens the popover. */
const CLIP_CLASS: Record<1 | 2, string> = {
  1: 'overflow-hidden whitespace-nowrap',
  2: 'overflow-hidden whitespace-normal leading-5 max-h-10',
}

export default function ListTextTooltip({
  text,
  className = '',
  lines = 1,
  emptyLabel = '—',
}: ListTextTooltipProps) {
  const trimmed = text?.trim() ?? ''
  const hasContent = trimmed.length > 0
  const display = hasContent ? text! : emptyLabel

  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  const textRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const checkOverflow = useCallback(() => {
    const el = textRef.current
    if (!el || !hasContent) {
      setOverflows(false)
      return
    }
    setOverflows(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  }, [hasContent])

  useEffect(() => {
    checkOverflow()
    const el = textRef.current
    if (!el) return

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [checkOverflow, display, lines])

  const toggleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (open) {
        setOpen(false)
        return
      }
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        setAnchor(rect)
        setOpen(true)
      }
    },
    [open],
  )

  useEffect(() => {
    if (!open) return

    const onScroll = () => setOpen(false)
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await navigator.clipboard.writeText(trimmed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <div className="flex items-start gap-1 min-w-0">
        <span
          ref={textRef}
          className={['min-w-0 flex-1 [text-overflow:clip]', CLIP_CLASS[lines], className].join(' ')}
        >
          {display}
        </span>
        {hasContent && overflows && (
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleOpen}
            title="Pokaż pełny opis"
            className={[
              'shrink-0 mt-px p-0.5 rounded',
              'text-[#8a7340] dark:text-[#c9a96e]',
              'hover:bg-[#c9a96e]/15 dark:hover:bg-[#c9a96e]/20 transition-colors',
              open ? 'bg-[#c9a96e]/15 dark:bg-[#c9a96e]/20' : '',
            ].join(' ')}
            aria-label="Pokaż pełny opis"
            aria-expanded={open}
          >
            <MessageSquareText size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {open &&
        anchor &&
        hasContent &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[200] max-w-sm pointer-events-auto"
            style={{
              left: Math.min(Math.max(8, anchor.right - 288), window.innerWidth - 304),
              top: anchor.bottom + 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-3 text-sm text-gray-900 dark:text-gray-100">
              <p className="whitespace-pre-wrap break-words">{trimmed}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? 'Skopiowano' : 'Kopiuj'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
