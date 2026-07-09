import {
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  FolderTree,
  Layers,
  Target,
  Wallet,
} from 'lucide-react'
import FilterSingleToggleGroup from '@/shared/components/form/FilterSingleToggleGroup'
import FilterToggleGroup from '@/shared/components/form/FilterToggleGroup'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import type { Direction } from '@/shared/types'
import type {
  BreakdownDirections,
  BreakdownGroupBy,
} from '@/domains/home/reports/shared/types/breakdown'
import { DIRECTION_OPTIONS } from '@/domains/home/transactions/constants/labels'

const PERIOD_MODE_OPTIONS = [
  { value: 'year', label: 'Roczny', icon: Calendar },
  { value: 'quarter', label: 'Kwartalny', icon: CalendarRange },
  { value: 'month', label: 'Miesięczny', icon: CalendarDays },
  { value: 'range', label: 'Zakres dat', icon: CalendarSearch },
] as const

const GROUP_BY_OPTIONS = [
  { value: 'categoryMain', label: 'Kategorie główne', icon: FolderTree },
  { value: 'categorySub', label: 'Podkategorie', icon: Layers },
  { value: 'wallet', label: 'Portfele', icon: Wallet },
  { value: 'concern', label: 'Obszary', icon: Target },
] as const

const DIRECTION_OPTIONS_BREAKDOWN = DIRECTION_OPTIONS.map((option) => ({
  ...option,
  label: option.value === 'EXPENSE' ? 'Wydatki' : 'Przychody',
}))

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

export function ReportPeriodModeToggle({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FilterSingleToggleGroup
      options={PERIOD_MODE_OPTIONS}
      value={value}
      onChange={onChange}
      variantForValue={() => 'brand'}
      ariaLabel="Tryb okresu"
      mobileIconsOnly
    />
  )
}

export function ReportGroupingSection({
  groupBy,
  directions,
  onGroupByChange,
  onDirectionsChange,
}: {
  groupBy: BreakdownGroupBy
  directions: BreakdownDirections
  onGroupByChange: (value: BreakdownGroupBy) => void
  onDirectionsChange: (value: BreakdownDirections) => void
}) {
  return (
    <div className="space-y-5">
      <SidebarSection label="Grupowanie">
        <FilterSingleToggleGroup
          options={GROUP_BY_OPTIONS}
          value={groupBy}
          onChange={(v) => onGroupByChange(v as BreakdownGroupBy)}
          variantForValue={() => 'brand'}
          ariaLabel="Grupowanie raportu"
          mobileIconsOnly
        />
      </SidebarSection>

      <SidebarSection label="Kierunek">
        <FilterToggleGroup
          options={DIRECTION_OPTIONS_BREAKDOWN}
          value={directions}
          onChange={(next) => {
            if (next.length === 0) return
            onDirectionsChange(next as BreakdownDirections)
          }}
          variantForValue={(v) => DIRECTION_PILL[v as Direction]}
          ariaLabel="Kierunek operacji"
        />
      </SidebarSection>
    </div>
  )
}
