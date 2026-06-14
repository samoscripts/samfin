import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SystemSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function SystemSection({ title, defaultOpen = true, children }: SystemSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <ChevronDown
          size={16}
          className={[
            'shrink-0 text-gray-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </div>
  )
}
