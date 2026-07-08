import { X } from 'lucide-react'
import { inputCls } from '@/shared/components/form/formClasses'

interface ClearableDateInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  className?: string
}

export default function ClearableDateInput({
  value,
  onChange,
  disabled = false,
  id,
  className = '',
}: ClearableDateInputProps) {
  return (
    <div className={['relative', className].join(' ')}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[inputCls, value ? 'pr-9' : ''].join(' ')}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Wyczyść datę"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
