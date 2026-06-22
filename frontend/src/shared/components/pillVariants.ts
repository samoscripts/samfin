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

export const PILL_VARIANT_OUTLINE_CLASS: Record<PillVariant, string> = {
  neutral:
    'border border-gray-300 text-gray-600 bg-transparent hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800/50',
  success:
    'border border-emerald-300 text-emerald-700 bg-transparent hover:bg-emerald-50/60 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
  danger:
    'border border-red-300 text-red-700 bg-transparent hover:bg-red-50/60 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/40',
  warning:
    'border border-amber-300 text-amber-700 bg-transparent hover:bg-amber-50/60 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40',
  info:
    'border border-sky-300 text-sky-700 bg-transparent hover:bg-sky-50/60 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-950/40',
  brand:
    'border border-[#163526]/30 text-[#163526] bg-transparent hover:bg-[#163526]/5 dark:border-[#c9a96e]/30 dark:text-[#c9a96e] dark:hover:bg-[#c9a96e]/10',
  sky:
    'border border-sky-300 text-sky-700 bg-transparent hover:bg-sky-50/60 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-950/40',
  purple:
    'border border-purple-300 text-purple-700 bg-transparent hover:bg-purple-50/60 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/40',
  orange:
    'border border-orange-300 text-orange-700 bg-transparent hover:bg-orange-50/60 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/40',
}
