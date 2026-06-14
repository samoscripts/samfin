import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ExpandableTextProps {
  text: string | null | undefined
  className?: string
  textClassName?: string
  lines?: 2 | 3 | 4
  emptyLabel?: string
}

const LINE_CLAMP: Record<2 | 3 | 4, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

export default function ExpandableText({
  text,
  className = '',
  textClassName = '',
  lines = 3,
  emptyLabel = '—',
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)
  const trimmed = text?.trim() ?? ''
  const hasContent = trimmed.length > 0
  const isLong = trimmed.length > 80 || trimmed.includes('\n')

  if (!hasContent) {
    return <span className={className}>{emptyLabel}</span>
  }

  return (
    <div className={className}>
      <p
        className={[
          expanded ? 'whitespace-pre-wrap break-words' : LINE_CLAMP[lines],
          textClassName,
        ].join(' ')}
      >
        {trimmed}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-0.5 text-xs text-[#8a7340] dark:text-[#c9a96e] hover:underline"
        >
          {expanded ? (
            <>
              Zwiń
              <ChevronUp size={12} />
            </>
          ) : (
            <>
              Rozwiń
              <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  )
}
