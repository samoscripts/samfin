import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Check, Loader2 } from 'lucide-react'
import type { PartyBankAccount, PartyBankAccountPayload } from '../types'
import {
  fetchPartyBankAccounts,
  createPartyBankAccount,
  updatePartyBankAccount,
  deactivatePartyBankAccount,
} from '@/shared/api/partyBankAccounts'
import { fetchProviders, type BankProvider } from '@/shared/api/csvImports'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'

interface Props {
  partyId: number
}

type FormMode = 'add' | { edit: PartyBankAccount }

function emptyPayload(partyId: number): PartyBankAccountPayload {
  return {
    partyId,
    bankName: '',
    accountNumber: '',
    displayName: '',
    ownerNameFromBank: '',
    currency: 'PLN',
    active: true,
  }
}

function payloadFromAccount(acc: PartyBankAccount): PartyBankAccountPayload {
  return {
    partyId: acc.partyId,
    bankName: acc.bankName ?? '',
    accountNumber: acc.accountNumber,
    displayName: acc.displayName ?? '',
    ownerNameFromBank: acc.ownerNameFromBank ?? '',
    currency: acc.currency,
    active: acc.active,
  }
}

interface BankAccountFormProps {
  partyId: number
  account: PartyBankAccount | null
  onSaved: (a: PartyBankAccount) => void
  onCancel: () => void
  bankProviders: BankProvider[]
}

function BankAccountForm({ partyId, account, onSaved, onCancel, bankProviders }: BankAccountFormProps) {
  const isEdit = account !== null
  const [form, setForm] = useState<PartyBankAccountPayload>(
    account ? payloadFromAccount(account) : emptyPayload(partyId),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof PartyBankAccountPayload>(key: K, value: PartyBankAccountPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function nullify(val: string | null): string | null {
    return val?.trim() || null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.accountNumber.trim()) {
      setError('Numer rachunku jest wymagany.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        bankName: nullify(form.bankName),
        displayName: nullify(form.displayName),
        ownerNameFromBank: nullify(form.ownerNameFromBank),
      }

      const saved = isEdit
        ? await updatePartyBankAccount(account!.id, payload)
        : await createPartyBankAccount(payload)
      onSaved(saved)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Wystąpił błąd podczas zapisywania.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#c9a96e]/30 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {isEdit ? 'Edytuj rachunek bankowy' : 'Nowy rachunek bankowy'}
      </h4>

      {error && <FormError message={error} className="text-xs px-3 py-2" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nazwa wyświetlana">
          <input
            type="text"
            className={configInputCls}
            placeholder="np. eKonto"
            value={form.displayName ?? ''}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </FormField>
        <FormField label="Bank">
          <Select
            className={configSelectCls}
            value={form.bankName ?? ''}
            onChange={(e) => set('bankName', e.target.value || null as unknown as string)}
          >
            <option value="">— nieokreślony —</option>
            {bankProviders.map((p) => (
              <option key={p.code} value={p.displayName}>{p.displayName}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Numer rachunku" required>
        <input
          type="text"
          className={configInputCls}
          placeholder="np. 67 1140 2004 0000 3802 7450 3818"
          value={form.accountNumber}
          onChange={(e) => set('accountNumber', e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Właściciel rachunku (z banku)">
          <input
            type="text"
            className={configInputCls}
            placeholder="np. JAN KOWALSKI"
            value={form.ownerNameFromBank ?? ''}
            onChange={(e) => set('ownerNameFromBank', e.target.value)}
          />
        </FormField>
        <FormField label="Waluta">
          <input
            type="text"
            className={configInputCls}
            placeholder="PLN"
            maxLength={10}
            value={form.currency}
            onChange={(e) => set('currency', e.target.value.toUpperCase())}
          />
        </FormField>
      </div>

      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="acc-active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-[#c9a96e]"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <label htmlFor="acc-active" className="text-sm text-gray-700 dark:text-gray-300">
            Rachunek aktywny
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a472a] hover:bg-[#163526] disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={13} />
          Anuluj
        </button>
      </div>
    </form>
  )
}

export default function PartyBankAccountsSection({ partyId }: Props) {
  const [accounts, setAccounts] = useState<PartyBankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)
  const [bankProviders, setBankProviders] = useState<BankProvider[]>([])

  useEffect(() => {
    setIsLoading(true)
    fetchPartyBankAccounts(partyId)
      .then(setAccounts)
      .finally(() => setIsLoading(false))
    fetchProviders().then(setBankProviders).catch(() => {})
  }, [partyId])

  function handleSaved(saved: PartyBankAccount) {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setFormMode(null)
  }

  async function handleDeactivate(id: number) {
    if (!confirm('Dezaktywować ten rachunek bankowy?')) return
    setDeactivating(id)
    try {
      await deactivatePartyBankAccount(id)
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, active: false } : a)))
    } finally {
      setDeactivating(null)
    }
  }

  const editingId = formMode && formMode !== 'add' ? (formMode as { edit: PartyBankAccount }).edit.id : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rachunki bankowe</h3>
        {formMode === null && (
          <button
            onClick={() => setFormMode('add')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus size={13} />
            Dodaj rachunek
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {accounts.length === 0 && formMode === null && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              Brak rachunków bankowych. Kliknij „Dodaj rachunek", aby dodać pierwszy.
            </p>
          )}

          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id}>
                {editingId === acc.id ? (
                  <BankAccountForm
                    partyId={partyId}
                    account={acc}
                    onSaved={handleSaved}
                    onCancel={() => setFormMode(null)}
                    bankProviders={bankProviders}
                  />
                ) : (
                  <div
                    className={[
                      'rounded-xl border p-3.5',
                      acc.active
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 opacity-60',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {acc.displayName ?? acc.accountNumber}
                          </span>
                          {acc.bankName && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {acc.bankName}
                            </span>
                          )}
                          {!acc.active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                              Nieaktywny
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {acc.accountNumber}
                        </p>
                        {acc.ownerNameFromBank && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {acc.ownerNameFromBank} · {acc.currency}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setFormMode({ edit: acc })}
                          disabled={formMode !== null}
                          title="Edytuj"
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                        >
                          <Pencil size={13} />
                        </button>
                        {acc.active && (
                          <button
                            onClick={() => handleDeactivate(acc.id)}
                            disabled={deactivating === acc.id || formMode !== null}
                            title="Dezaktywuj"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                          >
                            {deactivating === acc.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <X size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {formMode === 'add' && (
            <BankAccountForm
              partyId={partyId}
              account={null}
              onSaved={handleSaved}
              onCancel={() => setFormMode(null)}
              bankProviders={bankProviders}
            />
          )}
        </>
      )}
    </div>
  )
}
