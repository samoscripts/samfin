import {
  AlignLeft,
  FolderTree,
  Layers,
  Target,
  Wallet,
} from 'lucide-react'
import FilterSingleToggleGroup from '@/shared/components/form/FilterSingleToggleGroup'
import FilterToggleGroup from '@/shared/components/form/FilterToggleGroup'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import type { Direction } from '@/shared/types'
import type { TrendDirection, TrendSeriesBy } from '@/domains/home/reports/trend/types/trend'
import { DIRECTION_OPTIONS } from '@/domains/home/transactions/constants/labels'

const SERIES_BY_OPTIONS = [
  { value: 'none', label: 'Razem', icon: Layers },
  { value: 'description', label: 'Opisy', icon: AlignLeft },
  { value: 'category', label: 'Kategorie', icon: FolderTree },
  { value: 'wallet', label: 'Portfele', icon: Wallet },
  { value: 'concern', label: 'Dotyczy', icon: Target },
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

export function TrendDirectionSection({
  directions,
  onChange,
}: {
  directions: TrendDirection[]
  onChange: (directions: TrendDirection[]) => void
}) {
  return (
    <SidebarSection label="Kierunek">
      <FilterToggleGroup
        options={DIRECTION_OPTIONS}
        value={directions}
        onChange={(next) => {
          if (next.length === 0) return
          onChange(next as TrendDirection[])
        }}
        variantForValue={(v) => DIRECTION_PILL[v as Direction]}
        ariaLabel="Kierunek operacji"
      />
    </SidebarSection>
  )
}

export function TrendSeriesBySection({
  value,
  onChange,
}: {
  value: TrendSeriesBy
  onChange: (value: TrendSeriesBy) => void
}) {
  return (
    <SidebarSection label="Porównaj wg">
      <FilterSingleToggleGroup
        options={SERIES_BY_OPTIONS}
        value={value}
        onChange={(v) => onChange(v as TrendSeriesBy)}
        variantForValue={() => 'brand'}
        ariaLabel="Wymiar porównania"
        mobileIconsOnly
      />
    </SidebarSection>
  )
}
