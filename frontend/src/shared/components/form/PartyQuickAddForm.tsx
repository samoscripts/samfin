import { useEffect, useMemo, useState } from 'react'
import type { Party, PartyType, OwnershipType } from '@/domains/home/configuration/general/parties/types'
import {
  OWNERSHIP_TYPE_LABELS,
  PARTY_TYPE_LABELS,
} from '@/domains/home/configuration/general/parties/types'
import { createParty } from '@/shared/api/parties'
import Select from '@/shared/components/form/Select'
import { btnSecondary, configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

export interface PartyQuickAddFormProps {
  initialName?: string
  onCreated: (party: Party) => void | Promise<void>
  onCancel: () => void
  quickAddDefaults?: { type?: PartyType; ownershipType?: OwnershipType }
  allowedTypes?: PartyType[]
  allowedOwnerships?: OwnershipType[]
}

export default function PartyQuickAddForm({
  initialName = '',
  onCreated,
  onCancel,
  quickAddDefaults,
  allowedTypes,
  allowedOwnerships,
}: PartyQuickAddFormProps) {
  const [name, setName] = useState(initialName)
  const [quickType, setQuickType] = useState<PartyType>(quickAddDefaults?.type ?? 'OTHER')
  const [quickOwnership, setQuickOwnership] = useState<OwnershipType>(
    quickAddDefaults?.ownershipType ?? 'EXTERNAL',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    setName(initialName)
  }, [initialName])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Podaj nazwę podmiotu.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const party = await createParty({
        name: trimmed,
        type: quickType,
        ownershipType: quickOwnership,
        description: null,
        active: true,
      })
      await onCreated(party)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się dodać podmiotu.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-1">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nowy podmiot</p>
      <input
        type="text"
        className={configInputCls}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa"
        autoFocus
        disabled={saving}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select
          className={configSelectCls}
          value={quickType}
          onChange={(e) => setQuickType(e.target.value as PartyType)}
          disabled={saving || typeOptions.length <= 1}
        >
          {typeOptions.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          className={configSelectCls}
          value={quickOwnership}
          onChange={(e) => setQuickOwnership(e.target.value as OwnershipType)}
          disabled={saving || ownershipOptions.length <= 1}
        >
          {ownershipOptions.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          className={[btnSecondary, 'flex-1 py-2 text-xs'].join(' ')}
          onClick={onCancel}
          disabled={saving}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="flex-1 py-2 text-xs font-medium rounded-lg text-white bg-[#1c4230] hover:opacity-90 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Zapisywanie…' : 'Dodaj'}
        </button>
      </div>
    </form>
  )
}
