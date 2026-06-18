import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import type { Party, PartyType, OwnershipType } from '@/domains/home/configuration/parties/types'
import {
  OWNERSHIP_TYPE_LABELS,
  PARTY_TYPE_LABELS,
} from '@/domains/home/configuration/parties/types'
import { createParty } from '@/shared/api/parties'
import Select from '@/shared/components/form/Select'
import { btnSecondary, configInputCls, configSelectCls, selectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface PartySelectProps {
  parties: Party[]
  value: number | null | undefined
  onChange: (value: number | null) => void
  emptyLabel?: string
  disabled?: boolean
  className?: string
  allowQuickAdd?: boolean
  onPartyCreated?: (party: Party) => void | Promise<void>
  excludePartyId?: number | null
  quickAddDefaults?: { type?: PartyType; ownershipType?: OwnershipType }
  allowedTypes?: PartyType[]
  allowedOwnerships?: OwnershipType[]
}

function normalizeSearch(text: string): string {
  return text.trim().toLocaleLowerCase('pl')
}

function partyMatchesQuery(party: Party, query: string): boolean {
  if (!query) return true
  const q = normalizeSearch(query)
  return party.name.toLocaleLowerCase('pl').includes(q)
}

export default function PartySelect({
  parties,
  value,
  onChange,
  emptyLabel = '— wybierz —',
  disabled = false,
  className,
  allowQuickAdd = true,
  onPartyCreated,
  excludePartyId = null,
  quickAddDefaults,
  allowedTypes,
  allowedOwnerships,
}: PartySelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickType, setQuickType] = useState<PartyType>(quickAddDefaults?.type ?? 'OTHER')
  const [quickOwnership, setQuickOwnership] = useState<OwnershipType>(
    quickAddDefaults?.ownershipType ?? 'EXTERNAL',
  )
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  const typeOptions = useMemo(() => {
    const entries = Object.entries(PARTY_TYPE_LABELS) as [PartyType, string][]
    if (!allowedTypes?.length) return entries
    return entries.filter(([t]) => allowedTypes.includes(t))
  }, [allowedTypes])

  const ownershipOptions = useMemo(() => {
    const entries = Object.entries(OWNERSHIP_TYPE_LABELS) as [OwnershipType, string][]
    if (!allowedOwnerships?.length) return entries
    return entries.filter(([o]) => allowedOwnerships.includes(o))
  }, [allowedOwnerships])

  const visibleParties = useMemo(() => {
    return parties
      .filter((p) => p.active)
      .filter((p) => excludePartyId === null || p.id !== excludePartyId)
      .filter((p) => partyMatchesQuery(p, query))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [parties, excludePartyId, query])

  const numericValue =
    value === null || value === undefined ? null : Number(value)

  const selected = numericValue !== null ? parties.find((p) => p.id === numericValue) : undefined
  const displayLabel = selected?.name ?? emptyLabel
  const hasValue = selected != null

  const showQuickAddRow =
    allowQuickAdd &&
    !disabled &&
    normalizeSearch(query).length > 0 &&
    visibleParties.length === 0

  const listItemCount = visibleParties.length + (showQuickAddRow ? 1 : 0)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(0)
    setQuickAddOpen(false)
    setQuickError(null)
  }, [])

  const emitChange = useCallback(
    (partyId: number | null) => {
      onChange(partyId)
    },
    [onChange],
  )

  const selectParty = useCallback(
    (party: Party) => {
      emitChange(party.id)
      close()
    },
    [close, emitChange],
  )

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    setHighlightIndex(0)
  }, [open])

  useEffect(() => {
    if (highlightIndex >= listItemCount) {
      setHighlightIndex(Math.max(0, listItemCount - 1))
    }
  }, [highlightIndex, listItemCount])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [close, open])

  useEffect(() => {
    if (quickAddDefaults?.type) setQuickType(quickAddDefaults.type)
    if (quickAddDefaults?.ownershipType) setQuickOwnership(quickAddDefaults.ownershipType)
  }, [quickAddDefaults])

  useEffect(() => {
    if (typeOptions.length === 1) setQuickType(typeOptions[0][0])
  }, [typeOptions])

  useEffect(() => {
    if (ownershipOptions.length === 1) setQuickOwnership(ownershipOptions[0][0])
  }, [ownershipOptions])

  function openQuickAdd() {
    setQuickName(query.trim())
    setQuickType(quickAddDefaults?.type ?? typeOptions[0]?.[0] ?? 'OTHER')
    setQuickOwnership(quickAddDefaults?.ownershipType ?? ownershipOptions[0]?.[0] ?? 'EXTERNAL')
    setQuickError(null)
    setQuickAddOpen(true)
  }

  async function handleQuickAdd() {
    const name = quickName.trim()
    if (!name) {
      setQuickError('Podaj nazwę podmiotu.')
      return
    }

    setQuickSaving(true)
    setQuickError(null)
    try {
      const party = await createParty({
        name,
        type: quickType,
        ownershipType: quickOwnership,
        description: null,
        active: true,
      })
      await onPartyCreated?.(party)
      emitChange(party.id)
      close()
    } catch (err: unknown) {
      setQuickError(getApiErrorMessage(err, 'Nie udało się dodać podmiotu.'))
    } finally {
      setQuickSaving(false)
    }
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    void handleQuickAdd()
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (quickAddOpen) {
        setQuickAddOpen(false)
        return
      }
      close()
      return
    }
    if (quickAddOpen) return
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
        openQuickAdd()
        return
      }
      const party = visibleParties[highlightIndex]
      if (party) selectParty(party)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={[
          className ?? selectCls,
          'flex items-center justify-between gap-2 text-left',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="truncate">{displayLabel}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {hasValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Wyczyść"
              className="p-0.5 rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80 text-gray-400"
              onClick={(e) => {
                e.stopPropagation()
                emitChange(null)
                close()
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlightIndex(0)
                  setQuickAddOpen(false)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Szukaj podmiotu…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
            </div>
          </div>

          {quickAddOpen ? (
            <div className="p-3 space-y-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nowy podmiot</p>
              <input
                type="text"
                className={configInputCls}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="Nazwa"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  className={configSelectCls}
                  value={quickType}
                  onChange={(e) => setQuickType(e.target.value as PartyType)}
                  disabled={typeOptions.length <= 1}
                >
                  {typeOptions.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </Select>
                <Select
                  className={configSelectCls}
                  value={quickOwnership}
                  onChange={(e) => setQuickOwnership(e.target.value as OwnershipType)}
                  disabled={ownershipOptions.length <= 1}
                >
                  {ownershipOptions.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </Select>
              </div>
              {quickError && (
                <p className="text-xs text-red-600 dark:text-red-400">{quickError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={[btnSecondary, 'flex-1 py-1.5 text-xs'].join(' ')}
                  onClick={() => setQuickAddOpen(false)}
                  disabled={quickSaving}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg text-white bg-[#1c4230] hover:opacity-90 disabled:opacity-50"
                  disabled={quickSaving}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleQuickAdd()
                  }}
                >
                  {quickSaving ? 'Zapisywanie…' : 'Dodaj'}
                </button>
              </div>
            </div>
          ) : (
            <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto py-1">
              {visibleParties.length === 0 && !showQuickAddRow ? (
                <li className="px-3 py-2 text-sm text-gray-400">
                  {query.trim() ? 'Brak wyników' : 'Brak podmiotów'}
                </li>
              ) : (
                <>
                  {visibleParties.map((party, idx) => (
                    <li key={party.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={party.id === numericValue}
                        className={[
                          'w-full text-left px-3 py-2 text-sm',
                          idx === highlightIndex
                            ? 'bg-[#c9a96e]/15 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
                          party.id === numericValue ? 'font-medium' : '',
                        ].join(' ')}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onClick={() => selectParty(party)}
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
                          'w-full text-left px-3 py-2 text-sm flex items-center gap-2',
                          highlightIndex === visibleParties.length
                            ? 'bg-[#c9a96e]/15 text-[#1c4230] dark:text-[#c9a96e]'
                            : 'text-[#1c4230] dark:text-[#c9a96e] hover:bg-amber-50 dark:hover:bg-amber-950/20',
                        ].join(' ')}
                        onMouseEnter={() => setHighlightIndex(visibleParties.length)}
                        onClick={openQuickAdd}
                      >
                        <Plus size={14} />
                        Dodaj „{query.trim()}”
                      </button>
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
