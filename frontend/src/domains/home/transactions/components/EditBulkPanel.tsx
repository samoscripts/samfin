import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import {
  bulkUpdateTransactions,
  type BulkUpdateField,
} from '@/shared/api/transactions'
import {
  filterPartiesForField,
  isPartyFieldBulkBlocked,
} from '../utils/partyAssignment'
import { DIRECTION_LABEL_BY_VALUE, EDIT_EMPTY_LABEL } from '../constants/labels'
import { filterCategoriesForDirection, formatCategoryLabel } from '../utils/categoryOptions'
import DictionarySelect from './selects/DictionarySelect'
import { selectCls } from '@/shared/components/form/formClasses'

type FieldState = {
  enabled: boolean
  value: number | null
}

type BulkDraft = Record<BulkUpdateField, FieldState>

const FIELD_DEFS: { key: BulkUpdateField; label: string; group: 'party' | 'item' }[] = [
  { key: 'paidFromPartyId', label: 'Skąd', group: 'party' },
  { key: 'paidToPartyId', label: 'Dokąd', group: 'party' },
  { key: 'walletId', label: 'Portfel', group: 'item' },
  { key: 'concernId', label: 'Dotyczy', group: 'item' },
  { key: 'categoryId', label: 'Kategoria', group: 'item' },
]

const EMPTY_DRAFT = (): BulkDraft => ({
  paidFromPartyId: { enabled: false, value: null },
  paidToPartyId: { enabled: false, value: null },
  walletId: { enabled: false, value: null },
  concernId: { enabled: false, value: null },
  categoryId: { enabled: false, value: null },
})

function isDraftDirty(draft: BulkDraft): boolean {
  return FIELD_DEFS.some((f) => draft[f.key].enabled)
}

export interface EditBulkPanelProps {
  transactions: Transaction[]
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  parties: Party[]
  onSaved: () => void
  onSaveClick: () => void
  onCancelClick: () => void
  onRegisterSave: (fn: () => Promise<void>) => void
  onDirtyChange: (dirty: boolean) => void
}

export default function EditBulkPanel({
  transactions,
  wallets,
  concerns,
  categories,
  parties,
  onSaved,
  onSaveClick,
  onCancelClick,
  onRegisterSave,
  onDirtyChange,
}: EditBulkPanelProps) {
  const [draft, setDraft] = useState<BulkDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const direction = transactions[0]?.direction ?? 'EXPENSE'
  const directionLabel = DIRECTION_LABEL_BY_VALUE[direction] ?? direction
  const directionCls =
    direction === 'INCOME'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  const enabledFields = useMemo(
    () => FIELD_DEFS.filter((f) => draft[f.key].enabled),
    [draft],
  )

  const canSave = enabledFields.length > 0

  useEffect(() => {
    setDraft(EMPTY_DRAFT())
    setError(null)
    setSavedOk(false)
  }, [transactions.map((t) => t.transactionId).join(',')])

  useEffect(() => {
    onDirtyChange(isDraftDirty(draft))
  }, [draft, onDirtyChange])

  const setFieldEnabled = useCallback((key: BulkUpdateField, enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }))
    setError(null)
  }, [])

  const setFieldValue = useCallback((key: BulkUpdateField, value: number | null) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    const fields = FIELD_DEFS.filter((f) => draft[f.key].enabled).map((f) => f.key)
    if (fields.length === 0) {
      const msg = 'Wybierz co najmniej jedno pole do aktualizacji.'
      setError(msg)
      throw new Error(msg)
    }

    const values = Object.fromEntries(
      fields.map((key) => [key, draft[key].value]),
    ) as Partial<Record<BulkUpdateField, number | null>>

    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      await bulkUpdateTransactions({
        transactionIds: transactions.map((t) => t.transactionId),
        fields,
        values,
      })
      onSaved()
      setDraft(EMPTY_DRAFT())
      setSavedOk(true)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string }
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Błąd zapisu'
      setError(msg)
      throw e
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved, transactions])

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    onRegisterSave(() => handleSaveRef.current())
  }, [onRegisterSave])

  const paidFromBlocked = isPartyFieldBulkBlocked(transactions, 'paidFrom')
  const paidToBlocked = isPartyFieldBulkBlocked(transactions, 'paidTo')

  const bulkTxContext = {
    direction,
    source: transactions[0]?.source ?? 'CSV',
  } as const

  const paidFromParties = filterPartiesForField(
    parties,
    bulkTxContext,
    'paidFrom',
    draft.paidToPartyId.enabled ? draft.paidToPartyId.value : null,
  )
  const paidToParties = filterPartiesForField(
    parties,
    bulkTxContext,
    'paidTo',
    draft.paidFromPartyId.enabled ? draft.paidFromPartyId.value : null,
  )
  const relevantCategories = filterCategoriesForDirection(categories, direction)

  const previewLines = enabledFields.map((f) => {
    const val = draft[f.key].value
    const display = resolveFieldDisplay(f.key, val, wallets, concerns, categories, parties)
    return { label: f.label, display }
  })

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Edycja zbiorcza
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${directionCls}`}>
            {directionLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {transactions.length}{' '}
          {transactions.length === 1 ? 'transakcja' : transactions.length < 5 ? 'transakcje' : 'transakcji'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Zaznaczone wiersze z bieżącej strony
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-3">
          <SectionLabel>Pola do nadpisania</SectionLabel>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Zaznacz pola, które chcesz ustawić dla wszystkich wybranych transakcji.
          </p>

          {FIELD_DEFS.map((field) => {
            const partyBlocked =
              (field.key === 'paidFromPartyId' && paidFromBlocked) ||
              (field.key === 'paidToPartyId' && paidToBlocked)

            return (
            <div key={field.key} className="space-y-1.5">
              <label className={`flex items-center gap-2 ${partyBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={draft[field.key].enabled}
                  disabled={partyBlocked}
                  onChange={(e) => setFieldEnabled(field.key, e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#1c4230] focus:ring-[#c9a96e]/40 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{field.label}</span>
              </label>
              {partyBlocked && (
                <p className="pl-6 text-[10px] text-gray-400">
                  Zablokowane dla transakcji z importu CSV
                </p>
              )}

              {draft[field.key].enabled && !partyBlocked && (
                <div className="pl-6">
                  {field.key === 'paidFromPartyId' && (
                    <select
                      value={draft[field.key].value ?? ''}
                      onChange={(e) => {
                        const partyId = e.target.value ? Number(e.target.value) : null
                        setDraft((prev) => ({
                          ...prev,
                          paidFromPartyId: { ...prev.paidFromPartyId, value: partyId },
                          paidToPartyId:
                            prev.paidToPartyId.value === partyId
                              ? { ...prev.paidToPartyId, value: null }
                              : prev.paidToPartyId,
                        }))
                      }}
                      className={selectCls}
                    >
                      <option value="">{EDIT_EMPTY_LABEL}</option>
                      {paidFromParties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.key === 'paidToPartyId' && (
                    <select
                      value={draft[field.key].value ?? ''}
                      onChange={(e) => {
                        const partyId = e.target.value ? Number(e.target.value) : null
                        setDraft((prev) => ({
                          ...prev,
                          paidToPartyId: { ...prev.paidToPartyId, value: partyId },
                          paidFromPartyId:
                            prev.paidFromPartyId.value === partyId
                              ? { ...prev.paidFromPartyId, value: null }
                              : prev.paidFromPartyId,
                        }))
                      }}
                      className={selectCls}
                    >
                      <option value="">{EDIT_EMPTY_LABEL}</option>
                      {paidToParties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.key === 'walletId' && (
                    <DictionarySelect
                      items={wallets}
                      value={draft[field.key].value}
                      onChange={(v) => setFieldValue(field.key, v as number | null)}
                      emptyLabel={EDIT_EMPTY_LABEL}
                      valueType="number"
                      filterItem={(w) => w.active}
                    />
                  )}
                  {field.key === 'concernId' && (
                    <DictionarySelect
                      items={concerns}
                      value={draft[field.key].value}
                      onChange={(v) => setFieldValue(field.key, v as number | null)}
                      emptyLabel={EDIT_EMPTY_LABEL}
                      valueType="number"
                      filterItem={(c) => c.active}
                    />
                  )}
                  {field.key === 'categoryId' && (
                    <DictionarySelect
                      items={relevantCategories}
                      value={draft[field.key].value}
                      onChange={(v) => setFieldValue(field.key, v as number | null)}
                      emptyLabel={EDIT_EMPTY_LABEL}
                      valueType="number"
                      getLabel={formatCategoryLabel}
                    />
                  )}
                </div>
              )}
            </div>
            )
          })}
        </div>

        {enabledFields.length > 0 && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <div className="space-y-2">
              <SectionLabel>Podgląd zmian</SectionLabel>
              <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 space-y-1">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Zostanie zaktualizowanych:{' '}
                  <span className="font-semibold">{transactions.length}</span> {transactions.length === 1 ? 'transakcja' : 'transakcji'}
                </p>
                {previewLines.map((line) => (
                  <p key={line.label} className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-gray-500 dark:text-gray-500">{line.label}</span>
                    <span className="mx-1.5 text-gray-300 dark:text-gray-600">→</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{line.display}</span>
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 shrink-0">
          {error}
        </div>
      )}
      {savedOk && !error && (
        <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
          Zaktualizowano pomyślnie
        </div>
      )}

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 flex gap-2">
        <button
          onClick={onCancelClick}
          disabled={saving}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          Anuluj
        </button>
        <button
          onClick={onSaveClick}
          disabled={saving || !canSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1c4230' }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Zapisywanie…' : 'Zastosuj'}
        </button>
      </div>
    </div>
  )
}

function resolveFieldDisplay(
  key: BulkUpdateField,
  value: number | null,
  wallets: Wallet[],
  concerns: Concern[],
  categories: Category[],
  parties: Party[],
): string {
  if (value === null) return EDIT_EMPTY_LABEL
  if (key === 'paidFromPartyId' || key === 'paidToPartyId') {
    return parties.find((p) => p.id === value)?.name ?? String(value)
  }
  if (key === 'walletId') return wallets.find((w) => w.id === value)?.name ?? String(value)
  if (key === 'concernId') return concerns.find((c) => c.id === value)?.name ?? String(value)
  const cat = categories.find((c) => c.id === value)
  if (!cat) return String(value)
  return formatCategoryLabel(cat)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{children}</p>
  )
}
