import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { Party, PartyType, OwnershipType } from '@/domains/home/configuration/general/parties/types'
import PartyPickerContent from '@/shared/components/form/PartyPickerContent'
import PickerOverlay from '@/shared/components/form/PickerOverlay'
import { selectCls } from '@/shared/components/form/formClasses'

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
  pickerTitle?: string
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
  pickerTitle = 'Wybierz stronę',
}: PartySelectProps) {
  const [open, setOpen] = useState(false)

  const numericValue = value === null || value === undefined ? null : Number(value)

  const selected = useMemo(
    () => (numericValue !== null ? parties.find((p) => p.id === numericValue) : undefined),
    [numericValue, parties],
  )
  const displayLabel = selected?.name ?? emptyLabel
  const hasValue = selected != null

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const handleSelect = useCallback(
    (partyId: number) => {
      onChange(partyId)
      close()
    },
    [close, onChange],
  )

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(true)}
        onKeyDown={handleTriggerKeyDown}
        className={[
          className ?? selectCls,
          'flex items-center justify-between gap-2 text-left w-full',
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
                onChange(null)
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </span>
      </button>

      <PickerOverlay open={open} onClose={close} title={pickerTitle}>
        <PartyPickerContent
          parties={parties}
          selectedId={numericValue}
          allowQuickAdd={allowQuickAdd}
          onSelect={handleSelect}
          onPartyCreated={onPartyCreated}
          excludePartyId={excludePartyId}
          quickAddDefaults={quickAddDefaults}
          allowedTypes={allowedTypes}
          allowedOwnerships={allowedOwnerships}
        />
      </PickerOverlay>
    </>
  )
}
