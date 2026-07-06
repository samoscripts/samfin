import {
  ArrowDownLeft,
  ArrowUpRight,
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
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import type { Direction } from '@/shared/types'
import type { BreakdownDirection, BreakdownGroupBy } from '@/domains/home/reports/shared/types/breakdown'

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

const DIRECTION_OPTIONS = [
  { value: 'EXPENSE', label: 'Wydatki', icon: ArrowUpRight },
  { value: 'INCOME', label: 'Przychody', icon: ArrowDownLeft },
] as const

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
  direction,
  onGroupByChange,
  onDirectionChange,
}: {
  groupBy: BreakdownGroupBy
  direction: BreakdownDirection
  onGroupByChange: (value: BreakdownGroupBy) => void
  onDirectionChange: (value: BreakdownDirection) => void
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
        <FilterSingleToggleGroup
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(v) => onDirectionChange(v as BreakdownDirection)}
          variantForValue={(v) => DIRECTION_PILL[v as Direction]}
          ariaLabel="Kierunek operacji"
          mobileIconsOnly
        />
      </SidebarSection>
    </div>
  )
}
