import { useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { FlowFilters } from '../types'
import { WALLET_LABELS, CONCERN_LABELS } from '../mockData'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const EMPTY_FILTERS: FlowFilters = {}
const MIN_WIDTH = 280
const MAX_WIDTH = 640

interface FilterDrawerProps {
  open: boolean
  width: number
  onWidthChange: (w: number) => void
  activeFilters: FlowFilters
  onApply: (filters: FlowFilters) => void
  onClose: () => void
}

export default function FilterDrawer({
  open,
  width,
  onWidthChange,
  activeFilters,
  onApply,
  onClose,
}: FilterDrawerProps) {
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<FlowFilters>(EMPTY_FILTERS)

  useEffect(() => {
    if (open) setDraft(activeFilters)
  }, [open, activeFilters])

  const setField = <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleClear = () => setDraft(EMPTY_FILTERS)

  const handleApply = () => {
    const clean = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v !== '' && v !== undefined),
    ) as FlowFilters
    onApply(clean)
    if (isMobile) onClose()
  }

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMouseMove = (e: MouseEvent) => {
      onWidthChange(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (startX - e.clientX))))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const content = (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtry</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Zamknij panel filtrów"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <Section label="Okres">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data od">
              <input type="date" value={draft.dateFrom ?? ''} onChange={(e) => setField('dateFrom', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Data do">
              <input type="date" value={draft.dateTo ?? ''} onChange={(e) => setField('dateTo', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>
        <Hr />
        <Section label="Typ operacji">
          <select value={draft.type ?? ''} onChange={(e) => setField('type', e.target.value as FlowFilters['type'])} className={inputCls}>
            <option value="">Wszystkie</option>
            <option value="INCOME">Wpływ</option>
            <option value="EXPENSE">Wydatek</option>
          </select>
        </Section>
        <Hr />
        <Section label="Kwota (zł)">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Od">
              <input type="number" min={0} placeholder="0,00" value={draft.amountMin ?? ''} onChange={(e) => setField('amountMin', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Do">
              <input type="number" min={0} placeholder="∞" value={draft.amountMax ?? ''} onChange={(e) => setField('amountMax', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>
        <Hr />
        <Section label="Portfel">
          <select value={draft.wallet ?? ''} onChange={(e) => setField('wallet', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            {Object.entries(WALLET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Section>
        <Section label="Dotyczy">
          <select value={draft.concern ?? ''} onChange={(e) => setField('concern', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            {Object.entries(CONCERN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Section>
        <Section label="Kategoria">
          <select value={draft.category ?? ''} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Section>
        <Section label="Status">
          <select value={draft.status ?? ''} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            <option value="CLASSIFIED">Sklasyfikowany</option>
            <option value="PARTIALLY_CLASSIFIED">Częściowo</option>
            <option value="UNCLASSIFIED">Nieklasyfikowany</option>
          </select>
        </Section>
        <Hr />
        <Section label="Skąd">
          <select value={draft.paidFrom ?? ''} onChange={(e) => setField('paidFrom', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            {PAID_FROM_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Section>
        <Section label="Dokąd">
          <select value={draft.paidTo ?? ''} onChange={(e) => setField('paidTo', e.target.value)} className={inputCls}>
            <option value="">Wszystkie</option>
            {PAID_TO_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Section>
        <Hr />
        <Section label="Tagi">
          <input type="text" placeholder="Szukaj tagów…" value={draft.tags ?? ''} onChange={(e) => setField('tags', e.target.value)} className={inputCls} />
        </Section>
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
        <button onClick={handleClear} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Wyczyść filtry
        </button>
        <button onClick={handleApply} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#1c4230' }}>
          Zastosuj filtry
        </button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        {open && (
          <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
        )}
        <aside
          className={[
            'fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col',
            'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
            'transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >
          {content}
        </aside>
      </>
    )
  }

  return (
    <aside
      className="relative h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: open ? width : 0 }}
    >
      {open && (
        <div className="absolute left-0 inset-y-0 w-1.5 cursor-col-resize z-10 group" onMouseDown={startResize}>
          <div className="h-full w-px ml-0.5 bg-transparent group-hover:bg-[#c9a96e]/40 transition-colors" />
        </div>
      )}
      <div className="flex flex-col h-full min-h-0" style={{ width }}>
        {content}
      </div>
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

function Hr() {
  return <div className="border-t border-gray-100 dark:border-gray-800" />
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'placeholder-gray-400 dark:placeholder-gray-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'

const CATEGORIES = [
  'Spożywcze', 'Drogeria', 'Wakacje', 'Rachunki', 'Samochód',
  'Ubrania', 'Dziecko', 'Salon', 'Oszczędności', 'Elektronika',
  'Dom', 'Jedzenie', 'Zdrowie', 'Rozrywka', 'Zasilenie budżetu',
  'Środki prywatne', 'Pożyczka',
]

const PAID_FROM_OPTIONS: [string, string][] = [
  ['KONTO_WSPOLNE', 'Konto wspólne'], ['KONTO_MACKA', 'Konto Maćka'],
  ['KONTO_FIRMOWE_BASI', 'Konto firmowe Basi'], ['GOTOWKA', 'Gotówka'],
  ['BASIA', 'Basia'], ['MACIEJ', 'Maciej'], ['PAYTEL', 'Paytel'],
  ['ALLEGRO', 'Allegro'], ['SZWAGIERKA', 'Szwagierka'], ['ZUS', 'ZUS'],
]

const PAID_TO_OPTIONS: [string, string][] = [
  ['BIEDRONKA', 'Biedronka'], ['ROSSMANN', 'Rossmann'], ['ZALANDO', 'Zalando'],
  ['ENERGA', 'Energa'], ['ORLEN', 'Orlen'], ['HEBE', 'Hebe'], ['APTEKA', 'Apteka'],
  ['KONTO_FIRMOWE_BASI', 'Konto firmowe Basi'], ['OSZCZEDNOSCI_WSPOLNE', 'Oszczędności wspólne'],
  ['OSZCZEDNOSCI_TOSI', 'Oszczędności Tosi'], ['URZAD_SKARBOWY', 'Urząd skarbowy'],
  ['HURTOWNIA_FRYZJERSKA', 'Hurtownia fryzjerska'], ['LINIE_LOTNICZE', 'Linie lotnicze'],
  ['SKLEP_KOMPUTEROWY', 'Sklep komputerowy'], ['CASTORAMA', 'Castorama'],
  ['SKLEP_OBUWNICZY', 'Sklep obuwniczy'], ['STEAM', 'Steam'],
  ['DOSTAWCA_OPALU', 'Dostawca opału'], ['NIEZNANY', 'Nieznany'],
]
