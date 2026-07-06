import { CHART_PALETTE } from '@/shared/components/charts/chartColors'

export type ChartPaletteKind = 'diverse' | 'mono'

export interface ChartPaletteDefinition {
  label: string
  description: string
  kind: ChartPaletteKind
  income: readonly string[]
  expense: readonly string[]
}

interface HuePair {
  income: string
  expense: string
}

function pairsToArrays(pairs: readonly HuePair[]): { income: string[]; expense: string[] } {
  return {
    income: pairs.map((p) => p.income),
    expense: pairs.map((p) => p.expense),
  }
}

function darkenHex(hex: string, factor: number): string {
  const n = hex.replace('#', '')
  const r = Math.round(parseInt(n.slice(0, 2), 16) * factor)
  const g = Math.round(parseInt(n.slice(2, 4), 16) * factor)
  const b = Math.round(parseInt(n.slice(4, 6), 16) * factor)
  return `#${[r, g, b].map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')}`
}

function lightenHex(hex: string, factor: number): string {
  const n = hex.replace('#', '')
  const r = Math.round(parseInt(n.slice(0, 2), 16) + (255 - parseInt(n.slice(0, 2), 16)) * factor)
  const g = Math.round(parseInt(n.slice(2, 4), 16) + (255 - parseInt(n.slice(2, 4), 16)) * factor)
  const b = Math.round(parseInt(n.slice(4, 6), 16) + (255 - parseInt(n.slice(4, 6), 16)) * factor)
  return `#${[r, g, b].map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')}`
}

/** Każdy indeks = inny kolor (niebieski, zielony, żółty…); wpływ jasny, wydatek ciemny tej samej barwy. */
const RAINBOW_PAIRS: HuePair[] = [
  { income: '#93c5fd', expense: '#1d4ed8' },
  { income: '#86efac', expense: '#15803d' },
  { income: '#fde047', expense: '#a16207' },
  { income: '#fdba74', expense: '#c2410c' },
  { income: '#f9a8d4', expense: '#9d174d' },
  { income: '#c4b5fd', expense: '#6d28d9' },
  { income: '#67e8f9', expense: '#0e7490' },
  { income: '#bef264', expense: '#4d7c0f' },
  { income: '#fda4af', expense: '#9f1239' },
  { income: '#a5b4fc', expense: '#3730a3' },
  { income: '#fcd34d', expense: '#92400e' },
  { income: '#5eead4', expense: '#0f766e' },
]

const VIVID_PAIRS: HuePair[] = [
  { income: '#60a5fa', expense: '#1e3a8a' },
  { income: '#4ade80', expense: '#14532d' },
  { income: '#facc15', expense: '#854d0e' },
  { income: '#fb923c', expense: '#9a3412' },
  { income: '#f472b6', expense: '#831843' },
  { income: '#a78bfa', expense: '#4c1d95' },
  { income: '#22d3ee', expense: '#155e75' },
  { income: '#a3e635', expense: '#365314' },
  { income: '#fb7185', expense: '#881337' },
  { income: '#818cf8', expense: '#312e81' },
  { income: '#fbbf24', expense: '#78350f' },
  { income: '#2dd4bf', expense: '#134e4a' },
]

const SPRING_PAIRS: HuePair[] = [
  { income: '#bae6fd', expense: '#0369a1' },
  { income: '#bbf7d0', expense: '#166534' },
  { income: '#fef08a', expense: '#ca8a04' },
  { income: '#fed7aa', expense: '#ea580c' },
  { income: '#fbcfe8', expense: '#be185d' },
  { income: '#ddd6fe', expense: '#7c3aed' },
  { income: '#a5f3fc', expense: '#0891b2' },
  { income: '#d9f99d', expense: '#65a30d' },
  { income: '#fecdd3', expense: '#e11d48' },
  { income: '#c7d2fe', expense: '#4338ca' },
  { income: '#fde68a', expense: '#d97706' },
  { income: '#99f6e4', expense: '#0d9488' },
]

const AUTUMN_PAIRS: HuePair[] = [
  { income: '#fdba74', expense: '#9a3412' },
  { income: '#fcd34d', expense: '#92400e' },
  { income: '#fca5a5', expense: '#991b1b' },
  { income: '#fde68a', expense: '#b45309' },
  { income: '#f9a8d4', expense: '#9d174d' },
  { income: '#d8b4fe', expense: '#7e22ce' },
  { income: '#fed7aa', expense: '#c2410c' },
  { income: '#bef264', expense: '#3f6212' },
  { income: '#fda4af', expense: '#be123c' },
  { income: '#f0abfc', expense: '#a21caf' },
  { income: '#fbbf24', expense: '#854d0e' },
  { income: '#86efac', expense: '#166534' },
]

const COOL_PAIRS: HuePair[] = [
  { income: '#7dd3fc', expense: '#075985' },
  { income: '#6ee7b7', expense: '#065f46' },
  { income: '#a5b4fc', expense: '#312e81' },
  { income: '#67e8f9', expense: '#0e7490' },
  { income: '#c4b5fd', expense: '#5b21b6' },
  { income: '#5eead4', expense: '#115e59' },
  { income: '#93c5fd', expense: '#1e40af' },
  { income: '#99f6e4', expense: '#0f766e' },
  { income: '#bae6fd', expense: '#0369a1' },
  { income: '#818cf8', expense: '#3730a3' },
  { income: '#a7f3d0', expense: '#047857' },
  { income: '#38bdf8', expense: '#0c4a6e' },
]

const WARM_PAIRS: HuePair[] = [
  { income: '#fde68a', expense: '#b45309' },
  { income: '#fdba74', expense: '#c2410c' },
  { income: '#fca5a5', expense: '#b91c1c' },
  { income: '#f9a8d4', expense: '#be185d' },
  { income: '#fcd34d', expense: '#a16207' },
  { income: '#fed7aa', expense: '#ea580c' },
  { income: '#fbcfe8', expense: '#9d174d' },
  { income: '#fbbf24', expense: '#92400e' },
  { income: '#fda4af', expense: '#9f1239' },
  { income: '#f0abfc', expense: '#a21caf' },
  { income: '#fb923c', expense: '#9a3412' },
  { income: '#fecaca', expense: '#991b1b' },
]

const CANDY_PAIRS: HuePair[] = [
  { income: '#bfdbfe', expense: '#2563eb' },
  { income: '#bbf7d0', expense: '#16a34a' },
  { income: '#fef08a', expense: '#eab308' },
  { income: '#fed7aa', expense: '#f97316' },
  { income: '#fbcfe8', expense: '#ec4899' },
  { income: '#e9d5ff', expense: '#a855f7' },
  { income: '#a5f3fc', expense: '#06b6d4' },
  { income: '#d9f99d', expense: '#84cc16' },
  { income: '#fecdd3', expense: '#f43f5e' },
  { income: '#c7d2fe', expense: '#6366f1' },
  { income: '#fde68a', expense: '#f59e0b' },
  { income: '#ccfbf1', expense: '#14b8a6' },
]

const PASTEL_INCOME = CHART_PALETTE
const PASTEL_EXPENSE = CHART_PALETTE.map((c) => darkenHex(c, 0.72))

const rainbow = pairsToArrays(RAINBOW_PAIRS)
const vivid = pairsToArrays(VIVID_PAIRS)
const spring = pairsToArrays(SPRING_PAIRS)
const autumn = pairsToArrays(AUTUMN_PAIRS)
const cool = pairsToArrays(COOL_PAIRS)
const warm = pairsToArrays(WARM_PAIRS)
const candy = pairsToArrays(CANDY_PAIRS)

/** Palety wykresów — większość różnorodna (inny kolor na serię), kilka monochromatycznych. */
export const CHART_PALETTES = {
  rainbow: {
    label: 'Tęcza',
    description: 'Niebieski, zielony, żółty… — każda seria inna barwa, wpływ jasny / wydatek ciemny.',
    kind: 'diverse',
    income: rainbow.income,
    expense: rainbow.expense,
  },
  vivid: {
    label: 'Nasycone',
    description: 'Wyraziste, różnorodne kolory — dobrze rozróżnialne serie.',
    kind: 'diverse',
    income: vivid.income,
    expense: vivid.expense,
  },
  pastel: {
    label: 'Pastel',
    description: 'Miękkie, różnokolorowe pastele — wydatki ciemniejsze.',
    kind: 'diverse',
    income: PASTEL_INCOME,
    expense: PASTEL_EXPENSE,
  },
  spring: {
    label: 'Wiosna',
    description: 'Świeże, jasne barwy — różne odcienie na każdą kategorię.',
    kind: 'diverse',
    income: spring.income,
    expense: spring.expense,
  },
  autumn: {
    label: 'Jesień',
    description: 'Ciepła paleta — pomarańcze, złoto, bordo na zmianę.',
    kind: 'diverse',
    income: autumn.income,
    expense: autumn.expense,
  },
  cool: {
    label: 'Chłód',
    description: 'Błękity, turkusy, fiolety — zróżnicowane chłodne tony.',
    kind: 'diverse',
    income: cool.income,
    expense: cool.expense,
  },
  warm: {
    label: 'Ciepło',
    description: 'Żółcie, pomarańcze, róże — zróżnicowane ciepłe tony.',
    kind: 'diverse',
    income: warm.income,
    expense: warm.expense,
  },
  candy: {
    label: 'Cukierki',
    description: 'Jaskrawe, lekkie kolory — każda seria inny odcień.',
    kind: 'diverse',
    income: candy.income,
    expense: candy.expense,
  },
  graphite: {
    label: 'Grafit',
    description: 'Jedna tonacja — skala szarości, wydatki ciemniejsze.',
    kind: 'mono',
    income: [
      '#f3f4f6',
      '#e5e7eb',
      '#d1d5db',
      '#e2e8f0',
      '#f8fafc',
      '#cbd5e1',
      '#dce3eb',
      '#c4cdd6',
      '#b0bac9',
      '#a8b4c4',
      '#94a3b8',
      '#9ca3af',
    ],
    expense: [
      '#374151',
      '#4b5563',
      '#1f2937',
      '#52525b',
      '#3f3f46',
      '#6b7280',
      '#27272a',
      '#18181b',
      '#5c6370',
      '#2d3748',
      '#111827',
      '#44403c',
    ],
  },
  forest: {
    label: 'Las',
    description: 'Jedna tonacja — odcienie zieleni (wpływy) i czerwieni (wydatki).',
    kind: 'mono',
    income: [
      '#bbf7d0',
      '#86efac',
      '#4ade80',
      '#22c55e',
      '#a7f3d0',
      '#6ee7b7',
      '#34d399',
      '#10b981',
      '#16a34a',
      '#059669',
      '#15803d',
      '#047857',
    ],
    expense: [
      '#fecaca',
      '#fca5a5',
      '#f87171',
      '#ef4444',
      '#fda4af',
      '#fb7185',
      '#f43f5e',
      '#e11d48',
      '#dc2626',
      '#b91c1c',
      '#991b1b',
      '#9f1239',
    ],
  },
  brand: {
    label: 'SamFin',
    description: 'Jedna tonacja — zieleń i złoto aplikacji.',
    kind: 'mono',
    income: [
      lightenHex('#163526', 0.55),
      lightenHex('#1e4a32', 0.5),
      lightenHex('#2d6b4a', 0.45),
      lightenHex('#3d8b63', 0.4),
      lightenHex('#4a9d6f', 0.35),
      '#528f6a',
      '#6db88a',
      '#7ec49a',
      '#2d6b4a',
      '#3d8b63',
      '#4a9d6f',
      '#226644',
    ],
    expense: [
      lightenHex('#c9a96e', 0.35),
      '#d4b88a',
      '#e0c99a',
      '#dbb87d',
      '#ccb07a',
      '#c9a96e',
      '#b8924f',
      '#a67c3d',
      '#9e7040',
      '#8f6432',
      '#7a5528',
      '#6b4a22',
    ],
  },
} as const satisfies Record<string, ChartPaletteDefinition>

export type ChartPaletteId = keyof typeof CHART_PALETTES

export const CHART_PALETTE_IDS = Object.keys(CHART_PALETTES) as ChartPaletteId[]

export const CHART_DIVERSE_PALETTE_IDS = CHART_PALETTE_IDS.filter(
  (id) => CHART_PALETTES[id].kind === 'diverse',
)

export const CHART_MONO_PALETTE_IDS = CHART_PALETTE_IDS.filter(
  (id) => CHART_PALETTES[id].kind === 'mono',
)

export function getPaletteColor(
  paletteId: ChartPaletteId,
  direction: 'INCOME' | 'EXPENSE',
  index: number,
): string {
  const palette = CHART_PALETTES[paletteId]
  const colors = direction === 'INCOME' ? palette.income : palette.expense
  return colors[index % colors.length]
}

export function getPaletteDefinition(paletteId: ChartPaletteId): ChartPaletteDefinition {
  return CHART_PALETTES[paletteId]
}
