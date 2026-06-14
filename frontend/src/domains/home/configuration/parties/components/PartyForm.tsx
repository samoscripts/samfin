import { useState } from 'react'
import type { Party, PartyPayload, PartyType, OwnershipType } from '../types'
import { PARTY_TYPE_LABELS, OWNERSHIP_TYPE_LABELS } from '../types'
import { createParty, updateParty } from '@/shared/api/parties'

interface PartyFormProps {
  party?: Party | null
  onSaved: (party: Party) => void
  onCancel: () => void
}

const inputCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] transition-colors placeholder:text-gray-400'

const selectCls =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] transition-colors'

const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

export default function PartyForm({ party, onSaved, onCancel }: PartyFormProps) {
  const isEdit = !!party

  const [form, setForm] = useState<PartyPayload>({
    name: party?.name ?? '',
    type: party?.type ?? 'PERSON',
    ownershipType: party?.ownershipType ?? 'OWN',
    description: party?.description ?? '',
    active: party?.active ?? true,
  })

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof PartyPayload>(key: K, value: PartyPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload: PartyPayload = {
      ...form,
      description: form.description?.trim() || null,
    }

    setSaving(true)
    try {
      const saved = isEdit
        ? await updateParty(party!.id, payload)
        : await createParty(payload)
      onSaved(saved)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Wystąpił błąd podczas zapisywania.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className={labelCls}>Nazwa *</label>
        <input
          type="text"
          className={inputCls}
          placeholder="np. Lidl, Konto wspólne, Basia"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Typ podmiotu</label>
          <select
            className={selectCls}
            value={form.type}
            onChange={(e) => set('type', e.target.value as PartyType)}
          >
            {(Object.entries(PARTY_TYPE_LABELS) as [PartyType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Własność</label>
          <select
            className={selectCls}
            value={form.ownershipType}
            onChange={(e) => set('ownershipType', e.target.value as OwnershipType)}
          >
            {(Object.entries(OWNERSHIP_TYPE_LABELS) as [OwnershipType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Opis</label>
        <textarea
          className={[inputCls, 'resize-none'].join(' ')}
          rows={3}
          placeholder="Opcjonalny opis..."
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="party-active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-[#c9a96e]"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <label htmlFor="party-active" className="text-sm text-gray-700 dark:text-gray-300">
            Podmiot aktywny
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Dodaj podmiot'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
