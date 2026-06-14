import { useEffect, useState, useCallback, useRef } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { classifyTransactionItems, type ItemPayload } from '@/shared/api/transactions'
import { formatAmount } from '@/shared/utils/format'
import {
  MAX_SPLIT_ITEMS,
  MIN_SPLIT_ITEMS,
  roundMoney,
  sumItemAmounts,
  validateEditItems,
  isSumMatching,
} from '../utils/editValidation'
import {
  applyPartyFieldChange,
  filterPartiesForField,
  isOwnSideLocked,
  resolvePartyName,
} from '../utils/partyAssignment'
import { DIRECTION_LABEL_BY_VALUE, EDIT_EMPTY_LABEL } from '../constants/labels'
import { filterCategoriesForDirection, formatCategoryLabel } from '../utils/categoryOptions'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import { selectCls } from '@/shared/components/form/formClasses'

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

const EMPTY_ITEM = (amount = 0): ItemDraft => ({
  amount,
  walletId: null,
  concernId: null,
  categoryId: null,
  description: '',
})

function txToEditDraft(tx: Transaction): EditDraft {
  const items = tx.items ?? []
  return {
    paidFromPartyId: tx.paidFromPartyId ?? null,
    paidToPartyId: tx.paidToPartyId ?? null,
    items:
      items.length > 0
        ? items.map((item) => ({
            amount: item.amount,
            walletId: item.walletId ?? null,
            concernId: item.concernId ?? null,
            categoryId: item.categoryId ?? null,
            description: item.description ?? '',
          }))
        : [EMPTY_ITEM(tx.amount)],
  }
}

function isDraftDirty(draft: EditDraft, tx: Transaction): boolean {
  if ((draft.paidFromPartyId ?? null) !== (tx.paidFromPartyId ?? null)) return true
  if ((draft.paidToPartyId ?? null) !== (tx.paidToPartyId ?? null)) return true

  const txItems = tx.items ?? []
  const origItems =
    txItems.length > 0
      ? txItems
      : [{ amount: tx.amount, walletId: null, concernId: null, categoryId: null, description: null }]

  if (draft.items.length !== origItems.length) return true

  return draft.items.some((item, i) => {
    const orig = origItems[i]
    if (!orig) return true
    return (
      roundMoney(item.amount) !== roundMoney(orig.amount) ||
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

  const isSplit = (draft.items ?? []).length > 1
  const itemsSum = sumItemAmounts(draft.items ?? [])
  const sumOk = isSumMatching(draft.items ?? [], tx.amount)
  const validationError = validateEditItems(draft.items ?? [], tx.amount)

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
      setError(null)
    },
    [],
  )

  const handleAddSplit = useCallback(() => {
    if (draft.items.length >= MAX_SPLIT_ITEMS) return

    setDraft((prev) => {
      const allocated = sumItemAmounts(prev.items)
      const remaining = roundMoney(tx.amount - allocated)
      const newAmount = remaining > 0 ? remaining : 0

      return {
        ...prev,
        items: [...prev.items, EMPTY_ITEM(newAmount)],
      }
    })
    setError(null)
  }, [draft.items.length, tx.amount])

  const handleRemoveSplit = useCallback(
    (index: number) => {
      if (draft.items.length <= MIN_SPLIT_ITEMS) return

      setDraft((prev) => {
        const removed = prev.items[index]
        const next = prev.items.filter((_, i) => i !== index)
        const redistributed = roundMoney(next[0].amount + removed.amount)
        next[0] = { ...next[0], amount: redistributed }

        if (next.length === 1) {
          next[0] = { ...next[0], amount: tx.amount }
        }

        return { ...prev, items: next }
      })
      setError(null)
    },
    [draft.items.length, tx.amount],
  )

  const handleSave = useCallback(async () => {
    const normalizedItems = draft.items.map((item) => ({
      ...item,
      amount: roundMoney(item.amount),
    }))

    const clientError = validateEditItems(normalizedItems, tx.amount)
    if (clientError) {
      setError(clientError)
      throw new Error(clientError)
    }

    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      const payload = {
        paidFromPartyId: draft.paidFromPartyId,
        paidToPartyId: draft.paidToPartyId,
        items: normalizedItems.map(
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
      const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string }
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Błąd zapisu'
      setError(msg)
      throw e
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved, tx.amount, tx.transactionId])

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    onRegisterSave(() => handleSaveRef.current())
  }, [onRegisterSave])

  const paidFromLocked = isOwnSideLocked(tx, 'paidFrom')
  const paidToLocked = isOwnSideLocked(tx, 'paidTo')
  const paidFromParties = filterPartiesForField(
    parties,
    tx,
    'paidFrom',
    draft.paidToPartyId,
  )
  const paidToParties = filterPartiesForField(
    parties,
    tx,
    'paidTo',
    draft.paidFromPartyId,
  )
  const relevantCategories = filterCategoriesForDirection(categories, tx.direction)

  const directionLabel = DIRECTION_LABEL_BY_VALUE[tx.direction] ?? tx.direction
  const directionCls =
    tx.direction === 'INCOME'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <div className="flex flex-col h-full min-h-0">
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

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-3">
          <SectionLabel>Strony transakcji</SectionLabel>
          <FieldRow label="Skąd (wpłacający)">
            {paidFromLocked ? (
              <div className={readOnlyCls}>
                {resolvePartyName(parties, draft.paidFromPartyId)}
                <span className="block text-[10px] text-gray-400 mt-0.5">Ustalone przy imporcie</span>
              </div>
            ) : (
              <select
                value={draft.paidFromPartyId ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    ...applyPartyFieldChange(
                      prev,
                      'paidFrom',
                      e.target.value ? Number(e.target.value) : null,
                    ),
                  }))
                }
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
          </FieldRow>
          <FieldRow label="Dokąd (odbiorca)">
            {paidToLocked ? (
              <div className={readOnlyCls}>
                {resolvePartyName(parties, draft.paidToPartyId)}
                <span className="block text-[10px] text-gray-400 mt-0.5">Ustalone przy imporcie</span>
              </div>
            ) : (
              <select
                value={draft.paidToPartyId ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    ...applyPartyFieldChange(
                      prev,
                      'paidTo',
                      e.target.value ? Number(e.target.value) : null,
                    ),
                  }))
                }
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
          </FieldRow>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Klasyfikacja{isSplit ? ' (split)' : ''}</SectionLabel>
            {draft.items.length < MAX_SPLIT_ITEMS && (
              <button
                type="button"
                onClick={handleAddSplit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#1c4230] dark:text-[#c9a96e] border border-[#c9a96e]/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
              >
                <Plus size={12} />
                Dodaj pozycję
              </button>
            )}
          </div>

          {draft.items.map((item, i) => (
            <div
              key={i}
              className={[
                'space-y-3 rounded-lg border p-3',
                isSplit
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                  : 'border-transparent p-0',
              ].join(' ')}
            >
              {isSplit && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Pozycja {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-28">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={item.amount || ''}
                        onChange={(e) =>
                          setItemField(i, 'amount', roundMoney(parseFloat(e.target.value) || 0))
                        }
                        className={splitInputCls}
                      />
                    </div>
                    {draft.items.length > MIN_SPLIT_ITEMS && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(i)}
                        title="Usuń pozycję"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <FieldRow label="Portfel">
                <DictionarySelect
                  items={wallets}
                  value={item.walletId}
                  onChange={(v) => setItemField(i, 'walletId', v as number | null)}
                  emptyLabel={EDIT_EMPTY_LABEL}
                  valueType="number"
                  filterItem={(w) => w.active}
                />
              </FieldRow>

              <FieldRow label="Dotyczy">
                <DictionarySelect
                  items={concerns}
                  value={item.concernId}
                  onChange={(v) => setItemField(i, 'concernId', v as number | null)}
                  emptyLabel={EDIT_EMPTY_LABEL}
                  valueType="number"
                  filterItem={(c) => c.active}
                />
              </FieldRow>

              <FieldRow label="Kategoria">
                <DictionarySelect
                  items={relevantCategories}
                  value={item.categoryId}
                  onChange={(v) => setItemField(i, 'categoryId', v as number | null)}
                  emptyLabel={EDIT_EMPTY_LABEL}
                  valueType="number"
                  getLabel={formatCategoryLabel}
                />
              </FieldRow>
            </div>
          ))}

          {isSplit && (
            <div
              className={[
                'rounded-lg px-3 py-2 text-xs font-medium',
                sumOk
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
              ].join(' ')}
            >
              Suma pozycji: {formatAmount(itemsSum)} / {formatAmount(tx.amount)}
              {!sumOk && validationError && (
                <span className="block mt-0.5 font-normal opacity-90">{validationError}</span>
              )}
            </div>
          )}
        </div>
      </div>

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
          disabled={saving || !!validationError}
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

const readOnlyCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'

const splitInputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'
