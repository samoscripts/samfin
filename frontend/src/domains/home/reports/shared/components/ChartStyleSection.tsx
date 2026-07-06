import {
  CHART_DIVERSE_PALETTE_IDS,
  CHART_MONO_PALETTE_IDS,
  CHART_PALETTES,
  type ChartPaletteId,
} from '@/shared/components/charts/chartPalettes'
import type { ChartStyle } from '@/shared/components/charts/chartStyle'

interface ChartStyleSectionProps {
  value: ChartStyle
  onChange: (style: ChartStyle) => void
}

function PaletteSwatch({ style }: { style: ChartPaletteId }) {
  const palette = CHART_PALETTES[style]
  const previewCount = palette.kind === 'diverse' ? 4 : 2

  return (
    <span className="flex gap-0.5 shrink-0" aria-hidden="true">
      {Array.from({ length: previewCount }, (_, i) => (
        <span key={i} className="flex flex-col gap-px">
          <span
            className="w-2.5 h-2 rounded-sm border border-black/5 dark:border-white/10"
            style={{ backgroundColor: palette.income[i] }}
          />
          <span
            className="w-2.5 h-2 rounded-sm border border-black/5 dark:border-white/10"
            style={{ backgroundColor: palette.expense[i] }}
          />
        </span>
      ))}
    </span>
  )
}

function PaletteOption({
  id,
  value,
  onChange,
}: {
  id: ChartPaletteId
  value: ChartStyle
  onChange: (style: ChartStyle) => void
}) {
  const option = CHART_PALETTES[id]
  return (
    <label
      className={[
        'flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
        value === id
          ? 'border-[#c9a96e] bg-[#c9a96e]/10 dark:bg-[#c9a96e]/15'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50',
      ].join(' ')}
    >
      <input
        type="radio"
        name="chartStyle"
        value={id}
        checked={value === id}
        onChange={() => onChange(id)}
        className="sr-only"
      />
      <PaletteSwatch style={id} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
          {option.label}
        </span>
        <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
          {option.description}
        </span>
      </span>
    </label>
  )
}

export default function ChartStyleSection({ value, onChange }: ChartStyleSectionProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Paleta kolorów wykresów
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
          Dotyczy Trendu i Rozbicia. Każda seria ma inny kolor — wpływ jaśniejszy, wydatek ciemniejszy
          tej samej barwy. Zmiana natychmiastowa.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Różnorodne kolory
        </p>
        <div className="space-y-1.5" role="radiogroup" aria-label="Palety różnorodne">
          {CHART_DIVERSE_PALETTE_IDS.map((id) => (
            <PaletteOption key={id} id={id} value={value} onChange={onChange} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Jedna tonacja
        </p>
        <div className="space-y-1.5" role="radiogroup" aria-label="Palety monochromatyczne">
          {CHART_MONO_PALETTE_IDS.map((id) => (
            <PaletteOption key={id} id={id} value={value} onChange={onChange} />
          ))}
        </div>
      </div>
    </div>
  )
}
