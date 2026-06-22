import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Direction, Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { createTransaction, type ItemPayload } from '@/shared/api/transactions'
import ClassificationItemsEditor, {
  type ClassificationItemDraft,
} from '@/shared/components/classification/ClassificationItemsEditor'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import { FieldRow, SectionLabel } from '@/shared/components/form/FormSection'
import PartySelect from '@/shared/components/form/PartySelect'
import FilterToggleGroup from '@/shared/components/form/FilterToggleGroup'
import { inputCls, selectCls } from '@/shared/components/form/formClasses'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import { getApiErrorMessage } from '@/shared/utils/errors'
import { roundMoney } from '@/shared/utils/splitAllocation'
import { DIRECTION_OPTIONS, EDIT_EMPTY_LABEL } from '../constants/labels'
import {
  applyPartyFieldChange,
  filterPartiesForField,
} from '../utils/partyAssignment'
import { filterCategoriesForDirection } from '../utils/categoryOptions'
import type { TransactionNewUrlPrefill } from '../utils/transactionNewUrlParams'
import { defaultNewTransactionDate, parseAmountFromUrl, parseIdFromUrl } from '../utils/transactionNewUrlParams'

interface CreateDraft {
  direction: Direction
  date: string
  amount: number | null
  description: string
  paidFromPartyId: number | null
  paidToPartyId: number | null
  items: ClassificationItemDraft[]
}

function prefillToDraft(prefill: TransactionNewUrlPrefill): CreateDraft {
  const amount = parseAmountFromUrl(prefill.amount)
  const walletId = parseIdFromUrl(prefill.walletId)
  const concernId = parseIdFromUrl(prefill.concernId)
  const categoryId = parseIdFromUrl(prefill.categoryId)

  return {
    direction: prefill.direction ?? 'EXPENSE',
    date: prefill.date ?? defaultNewTransactionDate(),
    amount,
    description: prefill.description ?? '',
    paidFromPartyId: parseIdFromUrl(prefill.paidFromPartyId),
    paidToPartyId: parseIdFromUrl(prefill.paidToPartyId),
    items: [
      {
        amount: amount ?? undefined,
        walletId,
        concernId,
        categoryId,
        description: '',
      },
    ],
  }
}

function hasClassificationData(draft: CreateDraft): boolean {
  if (draft.paidFromPartyId !== null || draft.paidToPartyId !== null) return true
  return draft.items.some(
    (i) => i.walletId != null || i.concernId != null || i.categoryId != null,
  )
}

export interface TransactionCreateFormProps {
  prefill: TransactionNewUrlPrefill
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  parties: Party[]
  onCreated: (tx: Transaction) => void
  onCancel: () => void
  onPartyCreated?: (party: Party) => void
  onCategoryCreated?: (category: Category) => void
}

export default function TransactionCreateForm({
  prefill,
  wallets,
  concerns,
  categories,
  parties,
  onCreated,
  onCancel,
  onPartyCreated,
  onCategoryCreated,
}: TransactionCreateFormProps) {
  const [draft, setDraft] = useState<CreateDraft>(() => prefillToDraft(prefill))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(prefillToDraft(prefill))
    setError(null)
  }, [prefill])

  const txContext: Pick<Transaction, 'direction' | 'source'> = {
    direction: draft.direction,
    source: 'MANUAL',
  }

  const signedAmount =
    draft.amount != null
      ? draft.direction === 'EXPENSE'
        ? -Math.abs(draft.amount)
        : Math.abs(draft.amount)
      : 0

  const paidFromParties = filterPartiesForField(parties, txContext, 'paidFrom', draft.paidToPartyId)
  const paidToParties = filterPartiesForField(parties, txContext, 'paidTo', draft.paidFromPartyId)
  const relevantCategories = filterCategoriesForDirection(categories, draft.direction)

  const manualOwnFrom = draft.direction === 'EXPENSE'
  const manualOwnTo = draft.direction === 'INCOME'

  function updateAmount(next: number | null) {
    setDraft((prev) => ({
      ...prev,
      amount: next,
      items: prev.items.map((item, idx) =>
        idx === 0 ? { ...item, amount: next ?? undefined } : item,
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (draft.amount == null || draft.amount <= 0) {
      setError('Podaj kwotę większą od zera.')
      return
    }
    if (!draft.description.trim()) {
      setError('Opis jest wymagany.')
      return
    }
    if (!draft.date) {
      setError('Data jest wymagana.')
      return
    }

    const normalizedItems = draft.items.map((item) => ({
      ...item,
      amount: roundMoney(item.amount ?? draft.amount ?? 0),
    }))

    const includeClassification = hasClassificationData(draft)

    setSaving(true)
    try {
      const payload = {
        direction: draft.direction,
        date: draft.date,
        amount: draft.amount,
        description: draft.description.trim(),
        paidFromPartyId: draft.paidFromPartyId,
        paidToPartyId: draft.paidToPartyId,
        ...(includeClassification
          ? {
              items: normalizedItems.map(
                (item) =>
                  ({
                    amount: item.amount ?? draft.amount!,
                    walletId: item.walletId,
                    concernId: item.concernId,
                    categoryId: item.categoryId,
                    description: item.description || null,
                  }) as ItemPayload,
              ),
            }
          : {}),
      }

      const created = await createTransaction(payload)
      onCreated(created)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się utworzyć transakcji.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <FormError message={error} />}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-5">
        <div className="space-y-3">
          <SectionLabel>Podstawowe dane</SectionLabel>
          <FieldRow label="Kierunek">
            <FilterToggleGroup
              options={DIRECTION_OPTIONS}
              value={[draft.direction]}
              onChange={(values) => {
                const next = (values.length ? values[values.length - 1] : draft.direction) as Direction
                setDraft((prev) => ({
                  ...prev,
                  direction: next,
                  paidFromPartyId: null,
                  paidToPartyId: null,
                }))
              }}
              variantForValue={(v) => DIRECTION_PILL[v as Direction]}
              ariaLabel="Kierunek transakcji"
            />
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Data">
              <input
                type="date"
                className={inputCls}
                value={draft.date}
                onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </FieldRow>
            <FieldRow label="Kwota (PLN)">
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputCls}
                value={draft.amount ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  updateAmount(raw === '' ? null : Number.parseFloat(raw))
                }}
                required
              />
            </FieldRow>
          </div>
          <FieldRow label="Opis">
            <input
              type="text"
              className={inputCls}
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Opis transakcji…"
              required
            />
          </FieldRow>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <div className="space-y-3">
          <SectionLabel>Strony transakcji (opcjonalnie)</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Skąd (wpłacający)">
              <PartySelect
                parties={paidFromParties}
                value={draft.paidFromPartyId}
                onChange={(partyId) =>
                  setDraft((prev) => ({
                    ...prev,
                    ...applyPartyFieldChange(prev, 'paidFrom', partyId),
                  }))
                }
                emptyLabel={EDIT_EMPTY_LABEL}
                className={selectCls}
                excludePartyId={draft.paidToPartyId}
                onPartyCreated={onPartyCreated}
                allowedTypes={manualOwnFrom ? ['CASH'] : undefined}
                allowedOwnerships={manualOwnFrom ? ['OWN'] : undefined}
                quickAddDefaults={
                  manualOwnFrom
                    ? { type: 'CASH', ownershipType: 'OWN' }
                    : { type: 'OTHER', ownershipType: 'EXTERNAL' }
                }
              />
            </FieldRow>
            <FieldRow label="Dokąd (odbiorca)">
              <PartySelect
                parties={paidToParties}
                value={draft.paidToPartyId}
                onChange={(partyId) =>
                  setDraft((prev) => ({
                    ...prev,
                    ...applyPartyFieldChange(prev, 'paidTo', partyId),
                  }))
                }
                emptyLabel={EDIT_EMPTY_LABEL}
                className={selectCls}
                excludePartyId={draft.paidFromPartyId}
                onPartyCreated={onPartyCreated}
                allowedTypes={manualOwnTo ? ['CASH'] : undefined}
                allowedOwnerships={manualOwnTo ? ['OWN'] : undefined}
                quickAddDefaults={
                  manualOwnTo
                    ? { type: 'CASH', ownershipType: 'OWN' }
                    : { type: 'OTHER', ownershipType: 'EXTERNAL' }
                }
              />
            </FieldRow>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <ClassificationItemsEditor
          mode="transaction"
          items={draft.items}
          onChange={(items) => setDraft((prev) => ({ ...prev, items }))}
          wallets={wallets}
          concerns={concerns}
          categories={relevantCategories}
          totalAmount={signedAmount}
          direction={draft.direction}
          allowCategoryQuickAdd
          onCategoryCreated={onCategoryCreated}
        />
      </div>

      <FormActions saving={saving} submitLabel="Utwórz transakcję" onCancel={onCancel} />
    </form>
  )
}

export function TransactionCreateBreadcrumb({ onBack }: { onBack: () => void }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6">
      <button
        type="button"
        onClick={onBack}
        className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        Transakcje
      </button>
      <ChevronRight size={12} className="shrink-0" />
      <span className="text-gray-600 dark:text-gray-400 font-medium">Nowa transakcja</span>
    </nav>
  )
}
