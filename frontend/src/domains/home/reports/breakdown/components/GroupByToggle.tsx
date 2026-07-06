import type { BreakdownGroupBy, BreakdownDirection } from '@/domains/home/reports/shared/types/breakdown'

const GROUP_BY_OPTIONS: { value: BreakdownGroupBy; label: string }[] = [
  { value: 'categoryMain', label: 'Kategorie główne' },
  { value: 'categorySub', label: 'Podkategorie' },
  { value: 'wallet', label: 'Portfele' },
  { value: 'concern', label: 'Obszary' },
]

const DIRECTION_OPTIONS: { value: BreakdownDirection; label: string }[] = [
  { value: 'EXPENSE', label: 'Wydatki' },
  { value: 'INCOME', label: 'Przychody' },
]

interface GroupByToggleProps {
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  onGroupByChange: (value: BreakdownGroupBy) => void
  onDirectionChange: (value: BreakdownDirection) => void
}

function ToggleRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0 min-w-[72px]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              value === opt.value
                ? 'bg-[#163526] text-white dark:bg-[#c9a96e] dark:text-[#163526]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function GroupByToggle({
  groupBy,
  direction,
  onGroupByChange,
  onDirectionChange,
}: GroupByToggleProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <ToggleRow
        label="Grupuj"
        options={GROUP_BY_OPTIONS}
        value={groupBy}
        onChange={onGroupByChange}
      />
      <ToggleRow
        label="Kierunek"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={onDirectionChange}
      />
    </div>
  )
}
