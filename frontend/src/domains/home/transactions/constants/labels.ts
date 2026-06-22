import type { LucideIcon } from 'lucide-react'
import { ArrowDownLeft, ArrowUpRight, CircleCheck, CircleDashed, CircleX } from 'lucide-react'

export interface FilterOption {
  readonly value: string
  readonly label: string
  readonly icon: LucideIcon
}

export const DIRECTION_OPTIONS = [
  { value: 'INCOME', label: 'Wpływ', icon: ArrowDownLeft },
  { value: 'EXPENSE', label: 'Wydatek', icon: ArrowUpRight },
] as const satisfies readonly FilterOption[]

export const STATUS_OPTIONS = [
  { value: 'CLASSIFIED', label: 'Sklasyfikowany', icon: CircleCheck },
  { value: 'PARTIALLY_CLASSIFIED', label: 'Częściowo', icon: CircleDashed },
  { value: 'UNCLASSIFIED', label: 'Nieklasyfikowany', icon: CircleX },
] as const satisfies readonly FilterOption[]

export const DIRECTION_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  DIRECTION_OPTIONS.map((o) => [o.value, o.label]),
)

export const STATUS_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const FILTER_EMPTY_LABEL = 'Wszystkie'
export const EDIT_EMPTY_LABEL = '— brak —'
