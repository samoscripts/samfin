export type PillVariant =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'brand'
  | 'sky'
  | 'purple'
  | 'orange'

export type PillSize = 'xs' | 'sm' | 'md'

export const PILL_BASE =
  'inline-flex items-center rounded-full font-medium whitespace-nowrap'

export const PILL_SIZE_CLASS: Record<PillSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
  sm: 'px-1.5 py-0.5 text-[10px] font-medium',
  md: 'px-2 py-0.5 text-xs font-medium',
}

export const PILL_VARIANT_CLASS: Record<PillVariant, string> = {
  neutral:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  danger:
    'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  info:
    'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  brand:
    'bg-[#163526]/10 text-[#163526] dark:bg-[#c9a96e]/15 dark:text-[#c9a96e]',
  sky:
    'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  purple:
    'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  orange:
    'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
}
