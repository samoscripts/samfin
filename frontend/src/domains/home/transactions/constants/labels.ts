export const DIRECTION_OPTIONS = [
  { value: 'INCOME', label: 'Wpływ' },
  { value: 'EXPENSE', label: 'Wydatek' },
] as const

export const STATUS_OPTIONS = [
  { value: 'CLASSIFIED', label: 'Sklasyfikowany' },
  { value: 'PARTIALLY_CLASSIFIED', label: 'Częściowo' },
  { value: 'UNCLASSIFIED', label: 'Nieklasyfikowany' },
] as const

export const DIRECTION_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  DIRECTION_OPTIONS.map((o) => [o.value, o.label]),
)

export const STATUS_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const FILTER_EMPTY_LABEL = 'Wszystkie'
export const EDIT_EMPTY_LABEL = '— brak —'
