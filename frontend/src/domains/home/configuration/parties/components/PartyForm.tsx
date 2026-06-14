import { useState } from 'react'
import type { Party, PartyPayload, PartyType, OwnershipType } from '../types'
import { PARTY_TYPE_LABELS, OWNERSHIP_TYPE_LABELS } from '../types'
import { createParty, updateParty } from '@/shared/api/parties'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

interface PartyFormProps {
  party?: Party | null
  onSaved: (party: Party) => void
  onCancel: () => void
}

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
      setError(getApiErrorMessage(err, 'Wystąpił błąd podczas zapisywania.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}

      <FormField label="Nazwa" required>
        <input
          type="text"
          className={configInputCls}
          placeholder="np. Lidl, Konto wspólne, Basia"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Typ podmiotu">
          <Select
            className={configSelectCls}
            value={form.type}
            onChange={(e) => set('type', e.target.value as PartyType)}
          >
            {(Object.entries(PARTY_TYPE_LABELS) as [PartyType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Własność">
          <Select
            className={configSelectCls}
            value={form.ownershipType}
            onChange={(e) => set('ownershipType', e.target.value as OwnershipType)}
          >
            {(Object.entries(OWNERSHIP_TYPE_LABELS) as [OwnershipType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Opis">
        <textarea
          className={textareaCls}
          rows={3}
          placeholder="Opcjonalny opis..."
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
        />
      </FormField>

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

      <FormActions
        saving={saving}
        submitLabel={isEdit ? 'Zapisz zmiany' : 'Dodaj podmiot'}
        onCancel={onCancel}
      />
    </form>
  )
}
