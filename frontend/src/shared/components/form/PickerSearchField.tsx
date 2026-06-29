import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export interface PickerSearchFieldProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
}

const PickerSearchField = forwardRef<HTMLInputElement, PickerSearchFieldProps>(
  function PickerSearchField({ value, onChange, onKeyDown, placeholder = 'Szukaj…' }, ref) {
    const isMobile = useIsMobile()

    return (
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={ref}
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={!isMobile}
          className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
        />
      </div>
    )
  },
)

export default PickerSearchField
