import type { LucideIcon } from 'lucide-react'
import {
  PILL_VARIANT_CLASS,
  PILL_VARIANT_OUTLINE_CLASS,
  type PillVariant,
} from '@/shared/components/pillVariants'

export interface FilterToggleOption {
  value: string
  label: string
  icon: LucideIcon
}

export interface FilterToggleGroupProps {
  options: readonly FilterToggleOption[]
  value: string[]
  onChange: (value: string[]) => void
  variantForValue: (value: string) => PillVariant
  ariaLabel: string
}

export default function FilterToggleGroup({
  options,
  value,
  onChange,
  variantForValue,
  ariaLabel,
}: FilterToggleGroupProps) {
  const selected = new Set(value)
  const labelClass =
    options.length > 2
      ? 'hidden @[400px]:inline truncate text-center leading-tight'
      : 'hidden @[260px]:inline truncate text-center leading-tight'

  const toggle = (optionValue: string) => {
    const next = selected.has(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(next)
  }

  return (
    <div className="@container w-full" role="group" aria-label={ariaLabel}>
      <div className="flex w-full gap-2">
        {options.map((option) => {
          const isSelected = selected.has(option.value)
          const variant = variantForValue(option.value)
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              aria-label={option.label}
              title={option.label}
              onClick={() => toggle(option.value)}
              className={[
                'flex flex-1 min-w-0 items-center justify-center gap-2',
                'py-2.5 px-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                isSelected
                  ? [
                      PILL_VARIANT_CLASS[variant],
                      'shadow-sm ring-2 ring-inset ring-black/5 dark:ring-white/10',
                    ].join(' ')
                  : PILL_VARIANT_OUTLINE_CLASS[variant],
              ].join(' ')}
            >
              <Icon size={20} className="shrink-0" aria-hidden />
              <span className={labelClass}>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
