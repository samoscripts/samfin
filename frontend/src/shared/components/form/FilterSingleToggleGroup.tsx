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

export interface FilterSingleToggleGroupProps {
  options: readonly FilterToggleOption[]
  value: string
  onChange: (value: string) => void
  variantForValue: (value: string) => PillVariant
  ariaLabel: string
  /** Mobile: ikony; desktop (md+): tekst. Siatka 4×1 lub 2×2 wg szerokości. */
  mobileIconsOnly?: boolean
}

export default function FilterSingleToggleGroup({
  options,
  value,
  onChange,
  variantForValue,
  ariaLabel,
  mobileIconsOnly = false,
}: FilterSingleToggleGroupProps) {
  const legacyLabelClass =
    options.length > 2
      ? 'hidden @[400px]:inline truncate text-center leading-tight'
      : 'hidden @[260px]:inline truncate text-center leading-tight'

  const gridClass = mobileIconsOnly
    ? options.length === 4
      ? 'grid grid-cols-4 gap-2 md:grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))]'
      : options.length === 2
        ? 'grid grid-cols-2 gap-2'
        : 'grid gap-2 grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))]'
    : 'flex w-full gap-2 flex-wrap'

  const buttonBase =
    'flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors cursor-pointer min-w-0'

  const buttonSize = mobileIconsOnly ? 'py-2.5 px-1.5 md:px-2' : 'py-2.5 px-2'

  const buttonFlex = mobileIconsOnly ? '' : 'flex-1 min-w-[calc(50%-0.25rem)]'

  return (
    <div
      className={mobileIconsOnly ? 'w-full' : '@container w-full'}
      role="group"
      aria-label={ariaLabel}
    >
      <div className={gridClass}>
        {options.map((option) => {
          const isSelected = value === option.value
          const variant = variantForValue(option.value)
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.value)}
              className={[
                buttonBase,
                buttonSize,
                buttonFlex,
                isSelected
                  ? [
                      PILL_VARIANT_CLASS[variant],
                      'shadow-sm ring-2 ring-inset ring-black/5 dark:ring-white/10',
                    ].join(' ')
                  : PILL_VARIANT_OUTLINE_CLASS[variant],
              ].join(' ')}
            >
              <Icon
                size={mobileIconsOnly ? 18 : 20}
                className={mobileIconsOnly ? 'shrink-0 md:hidden' : 'shrink-0'}
                aria-hidden
              />
              <span
                className={
                  mobileIconsOnly
                    ? 'hidden md:inline truncate text-center leading-tight text-xs'
                    : legacyLabelClass
                }
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
