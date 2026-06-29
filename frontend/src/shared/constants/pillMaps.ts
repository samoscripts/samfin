import type { PillVariant } from '@/shared/components/pillVariants'
import type { Direction, Status } from '@/shared/types'

export const STATUS_PILL: Record<Status, PillVariant> = {
  CLASSIFIED: 'success',
  PARTIALLY_CLASSIFIED: 'warning',
  UNCLASSIFIED: 'danger',
}

export const DIRECTION_PILL: Record<Direction, PillVariant> = {
  INCOME: 'success',
  EXPENSE: 'danger',
}

export const IMPORT_STATUS_PILL: Record<string, PillVariant> = {
  PENDING: 'neutral',
  VALIDATED: 'info',
  FAILED: 'danger',
  IMPORTED: 'success',
}

export const IMPORT_ERROR_SCOPE_PILL: Record<string, PillVariant> = {
  HEADER: 'neutral',
  ROW: 'neutral',
}

export const USER_ROLE_PILL: Record<string, PillVariant> = {
  ADMIN: 'brand',
  USER: 'neutral',
}
