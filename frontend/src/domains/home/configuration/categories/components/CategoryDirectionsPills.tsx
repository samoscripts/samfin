import type { CategoryDirection } from '@/shared/api/categories'
import Pill from '@/shared/components/Pill'
import { CATEGORY_TYPE_PILL } from '@/shared/constants/pillMaps'

const DIRECTION_LABEL: Record<CategoryDirection, string> = {
  EXPENSE: 'Wydatek',
  INCOME: 'Wpływ',
}

export default function CategoryDirectionsPills({ directions }: { directions: CategoryDirection[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {directions.map((direction) => (
        <Pill key={direction} variant={CATEGORY_TYPE_PILL[direction]}>
          {DIRECTION_LABEL[direction]}
        </Pill>
      ))}
    </div>
  )
}
