import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Party, PartyType, OwnershipType } from '@/domains/home/configuration/parties/types'
import PartyQuickAddForm from '@/shared/components/form/PartyQuickAddForm'
import PickerSearchField from '@/shared/components/form/PickerSearchField'
import { btnSecondary } from '@/shared/components/form/formClasses'

function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('pl')
}

function partyMatchesQuery(party: Party, query: string): boolean {
  if (!query) return true
  const q = normalizeSearch(query)
  return party.name.toLocaleLowerCase('pl').includes(q)
}

export interface PartyPickerContentProps {
  parties: Party[]
  selectedId: number | null
  allowQuickAdd: boolean
  onSelect: (partyId: number) => void
  onPartyCreated?: (party: Party) => void | Promise<void>
  excludePartyId?: number | null
  quickAddDefaults?: { type?: PartyType; ownershipType?: OwnershipType }
  allowedTypes?: PartyType[]
  allowedOwnerships?: OwnershipType[]
  title?: string
}

export default function PartyPickerContent({
  parties,
  selectedId,
  allowQuickAdd,
  onSelect,
  onPartyCreated,
  excludePartyId = null,
  quickAddDefaults,
  allowedTypes,
  allowedOwnerships,
}: PartyPickerContentProps) {
  const listboxId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [view, setView] = useState<'list' | 'quickAdd'>('list')

  const visibleParties = useMemo(() => {
    return parties
      .filter((p) => p.active)
      .filter((p) => excludePartyId === null || p.id !== excludePartyId)
      .filter((p) => partyMatchesQuery(p, query))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [parties, excludePartyId, query])

  const showQuickAddRow =
    allowQuickAdd && view === 'list' && normalizeSearch(query).length > 0 && visibleParties.length === 0

  const listItemCount = visibleParties.length + (showQuickAddRow ? 1 : 0)

  useEffect(() => {
    setHighlightIndex(0)
  }, [query, view])

  useEffect(() => {
    if (highlightIndex >= listItemCount) {
      setHighlightIndex(Math.max(0, listItemCount - 1))
    }
  }, [highlightIndex, listItemCount])

  async function handlePartyCreated(party: Party) {
    await onPartyCreated?.(party)
    onSelect(party.id)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (view === 'quickAdd') return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, listItemCount - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showQuickAddRow && highlightIndex === visibleParties.length) {
        setView('quickAdd')
        return
      }
      const party = visibleParties[highlightIndex]
      if (party) onSelect(party.id)
    }
  }

  if (view === 'quickAdd') {
    return (
      <PartyQuickAddForm
        initialName={query.trim()}
        onCancel={() => setView('list')}
        onCreated={handlePartyCreated}
        quickAddDefaults={quickAddDefaults}
        allowedTypes={allowedTypes}
        allowedOwnerships={allowedOwnerships}
      />
    )
  }

  return (
    <>
      <PickerSearchField
        ref={searchRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleSearchKeyDown}
        placeholder="Szukaj podmiotu…"
      />

      <ul id={listboxId} role="listbox" className="pb-2">
        {visibleParties.length === 0 && !showQuickAddRow ? (
          <li className="py-2 text-sm text-gray-400">
            {query.trim() ? 'Brak wyników' : 'Brak podmiotów'}
          </li>
        ) : (
          <>
            {visibleParties.map((party, idx) => (
              <li key={party.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={party.id === selectedId}
                  className={[
                    'w-full text-left px-3 py-2 text-sm rounded-md',
                    idx === highlightIndex
                      ? 'bg-[#c9a96e]/15 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    party.id === selectedId ? 'font-medium' : '',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => onSelect(party.id)}
                >
                  {party.name}
                </button>
              </li>
            ))}
            {showQuickAddRow && (
              <li role="presentation">
                <button
                  type="button"
                  className={[
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md',
                    highlightIndex === visibleParties.length
                      ? 'bg-[#c9a96e]/15 text-[#1c4230] dark:text-[#c9a96e]'
                      : 'text-[#1c4230] dark:text-[#c9a96e] hover:bg-amber-50 dark:hover:bg-amber-950/20',
                  ].join(' ')}
                  onMouseEnter={() => setHighlightIndex(visibleParties.length)}
                  onClick={() => setView('quickAdd')}
                >
                  <Plus size={14} />
                  Dodaj „{query.trim()}”
                </button>
              </li>
            )}
          </>
        )}
      </ul>

      {allowQuickAdd && !showQuickAddRow && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            type="button"
            className={[btnSecondary, 'w-full py-2 text-xs flex items-center justify-center gap-1.5'].join(' ')}
            onClick={() => setView('quickAdd')}
          >
            <Plus size={14} />
            Dodaj nowy podmiot
          </button>
        </div>
      )}
    </>
  )
}
