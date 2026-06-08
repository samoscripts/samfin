import { useEffect, useState, useCallback, useRef } from 'react'
import { Save, Loader2 } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { classifyTransactionItems, type ItemPayload } from '@/shared/api/transactions'
import { formatAmount } from '@/shared/utils/format'

interface ItemDraft {
  amount: number
  walletId: number | null
  concernId: number | null
  categoryId: number | null
  description: string
}

interface EditDraft {
  paidFromPartyId: number | null
  paidToPartyId: number | null
  items: ItemDraft[]
}

function txToEditDraft(tx: Transaction): EditDraft {
  return {
    paidFromPartyId: tx.paidFromPartyId ?? null,
    paidToPartyId: tx.paidToPartyId ?? null,
    items:
      tx.items.length > 0
        ? tx.items.map((item) => ({
            amount: item.amount,
            walletId: item.walletId ?? null,
            concernId: item.concernId ?? null,
            categoryId: item.categoryId ?? null,
            description: item.description ?? '',
          }))
        : [{ amount: tx.amount, walletId: null, concernId: null, categoryId: null, description: '' }],
  }
}

function isDraftDirty(draft: EditDraft, tx: Transaction): boolean {
  if ((draft.paidFromPartyId ?? null) !== (tx.paidFromPartyId ?? null)) return true
  if ((draft.paidToPartyId ?? null) !== (tx.paidToPartyId ?? null)) return true
  const origItems = tx.items.length > 0 ? tx.items : [{ walletId: null, concernId: null, categoryId: null, description: null }]
  if (draft.items.length !== origItems.length) return true
  return draft.items.some((item, i) => {
    const orig = origItems[i]
    if (!orig) return true
    return (
      (item.walletId ?? null) !== (orig.walletId ?? null) ||
      (item.concernId ?? null) !== (orig.concernId ?? null) ||
      (item.categoryId ?? null) !== (orig.categoryId ?? null) ||
      item.description !== (orig.description ?? '')
    )
  })
}

export interface EditSinglePanelProps {
  tx: Transaction
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  parties: Party[]
  onSaved: (updated: Transaction) => void
  onSaveClick: () => void
  onCancelClick: () => void
  onRegisterSave: (fn: () => Promise<void>) => void
  onDirtyChange: (dirty: boolean) => void
}

export default function EditSinglePanel({
  tx,
  wallets,
  concerns,
  categories,
  parties,
  onSaved,
  onSaveClick,
  onCancelClick,
  onRegisterSave,
  onDirtyChange,
}: EditSinglePanelProps) {
  const [draft, setDraft] = useState<EditDraft>(() => txToEditDraft(tx))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    setDraft(txToEditDraft(tx))
    setError(null)
    setSavedOk(false)
  }, [tx.transactionId])

  useEffect(() => {
    onDirtyChange(isDraftDirty(draft, tx))
  }, [draft, tx, onDirtyChange])

  const setItemField = useCallback(
    <K extends keyof ItemDraft>(index: number, field: K, value: ItemDraft[K]) => {
      setDraft((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
      }))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      const payload = {
        paidFromPartyId: draft.paidFromPartyId,
        paidToPartyId: draft.paidToPartyId,
        items: draft.items.map(
          (item) =>
            ({
              amount: item.amount,
              walletId: item.walletId,
              concernId: item.concernId,
              categoryId: item.categoryId,
              description: item.description || null,
            }) as ItemPayload,
        ),
      }
      const updated = await classifyTransactionItems(tx.transactionId, payload)
      onSaved(updated)
      setDraft(txToEditDraft(updated))
      setSavedOk(true)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setError(err?.response?.data?.error ?? err?.message ?? 'Błąd zapisu')
      throw e
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved, tx.transactionId])

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    onRegisterSave(() => handleSaveRef.current())
  }, [onRegisterSave])

  const paidFromParties = parties.filter((p) => p.usageType === 'INCOME' || p.usageType === 'BOTH')
  const paidToParties = parties.filter((p) => p.usageType === 'EXPENSE' || p.usageType === 'BOTH')
  const relevantCategories = categories.filter((c) => c.active && c.type === tx.direction)

  const directionLabel = tx.direction === 'INCOME' ? 'Wpływ' : 'Wydatek'
  const directionCls =
    tx.direction === 'INCOME'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Transaction summary header */}
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{tx.date}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${directionCls}`}>
            {directionLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
          {tx.description ?? '—'}
        </p>
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatAmount(tx.amount)}</p>
      </div>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Party */}
        <div className="space-y-3">
          <SectionLabel>Strony transakcji</SectionLabel>
          <FieldRow label="Skąd (wpłacający)">
            <select
              value={draft.paidFromPartyId ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, paidFromPartyId: e.target.value ? Number(e.target.value) : null }))
              }
              className={selectCls}
            >
              <option value="">— brak —</option>
              {paidFromParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Dokąd (odbiorca)">
            <select
              value={draft.paidToPartyId ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, paidToPartyId: e.target.value ? Number(e.target.value) : null }))
              }
              className={selectCls}
            >
              <option value="">— brak —</option>
              {paidToParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldRow>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* Items */}
        {draft.items.map((item, i) => (
          <div key={i} className="space-y-3">
            {draft.items.length > 1 ? (
              <div className="flex items-center justify-between">
                <SectionLabel>Pozycja {i + 1}</SectionLabel>
                <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                  {formatAmount(item.amount)}
                </span>
              </div>
            ) : (
              <SectionLabel>Klasyfikacja</SectionLabel>
            )}

            <FieldRow label="Portfel">
              <select
                value={item.walletId ?? ''}
                onChange={(e) => setItemField(i, 'walletId', e.target.value ? Number(e.target.value) : null)}
                className={selectCls}
              >
                <option value="">— brak —</option>
                {wallets
                  .filter((w) => w.active)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </FieldRow>

            <FieldRow label="Dotyczy">
              <select
                value={item.concernId ?? ''}
                onChange={(e) => setItemField(i, 'concernId', e.target.value ? Number(e.target.value) : null)}
                className={selectCls}
              >
                <option value="">— brak —</option>
                {concerns
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </FieldRow>

            <FieldRow label="Kategoria">
              <select
                value={item.categoryId ?? ''}
                onChange={(e) => setItemField(i, 'categoryId', e.target.value ? Number(e.target.value) : null)}
                className={selectCls}
              >
                <option value="">— brak —</option>
                {relevantCategories.map((c) => {
                  const label = c.parentName ? `${c.parentName} / ${c.name}` : c.name
                  return (
                    <option key={c.id} value={c.id}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </FieldRow>
          </div>
        ))}
      </div>

      {/* Error / success */}
      {error && (
        <div className="px-5 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 shrink-0">
          {error}
        </div>
      )}
      {savedOk && !error && (
        <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
          Zapisano pomyślnie
        </div>
      )}

      {/* Save / Cancel */}
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
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1c4230' }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{children}</p>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

const selectCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'
