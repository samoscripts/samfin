import { useEffect, useState, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { classifyTransactionItems, type ItemPayload } from '@/shared/api/transactions'
import { transactionDisplayLabel } from '../utils/transactionDisplay'
import ClassificationItemsEditor, {
  type ClassificationItemDraft,
} from '@/shared/components/classification/ClassificationItemsEditor'
import FormError from '@/shared/components/form/FormError'
import { FieldRow, ReadOnlyField, SectionLabel } from '@/shared/components/form/FormSection'
import PartySelect from '@/shared/components/form/PartySelect'
import { inputCls, selectCls } from '@/shared/components/form/formClasses'
import Pill from '@/shared/components/Pill'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import { formatAmount } from '@/shared/utils/format'
import { DEFAULT_SPLIT_PERCENT } from '@/shared/utils/splitAllocation'
import { getApiErrorMessage } from '@/shared/utils/errors'
import { DIRECTION_LABEL_BY_VALUE, EDIT_EMPTY_LABEL } from '../constants/labels'
import {
  isSumMatching,
  roundMoney as roundMoneyVal,
  validateEditItems,
} from '../utils/editValidation'
import {
  applyPartyFieldChange,
  filterPartiesForField,
  isOwnSideLocked,
  resolvePartyName,
} from '../utils/partyAssignment'
import { filterActiveCategories } from '../utils/categoryOptions'
import {
  TransactionTemplateFormFooter,
  TransactionTemplateList,
} from './TransactionTemplateBar'
import { applyTemplateToDraft, templatePayloadFromDraft } from '../utils/transactionTemplates'

interface EditDraft {
  transCustomDescription: string
  paidFromPartyId: number | null
  paidToPartyId: number | null
  items: ClassificationItemDraft[]
}

function txToEditDraft(tx: Transaction): EditDraft {
  const rawItems = tx.items ?? []
  const items: ClassificationItemDraft[] =
    rawItems.length > 0
      ? rawItems.map((item) => ({
          amount: item.amount,
          walletId: item.walletId ?? null,
          concernId: item.concernId ?? null,
          categoryId: item.categoryId ?? null,
          description: item.description ?? '',
        }))
      : [{ amount: tx.amount, walletId: null, concernId: null, categoryId: null }]

  if (items.length === 2) {
    const absTotal = Math.abs(tx.amount)
    const p0 =
      absTotal > 0
        ? Math.round((Math.abs(items[0].amount ?? 0) / absTotal) * 100)
        : DEFAULT_SPLIT_PERCENT
    items[0] = { ...items[0], percent: p0 }
    items[1] = { ...items[1], percent: 100 - p0 }
  }

  return {
    transCustomDescription: tx.transCustomDescription ?? '',
    paidFromPartyId: tx.paidFromPartyId ?? null,
    paidToPartyId: tx.paidToPartyId ?? null,
    items,
  }
}

export interface TransactionEditFormProps {
  tx: Transaction
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  parties: Party[]
  onSaved: (updated: Transaction) => void
  onCancel: () => void
  onPartyCreated?: (party: Party) => void
  onCategoryCreated?: (category: Category) => void
}

export default function TransactionEditForm({
  tx,
  wallets,
  concerns,
  categories,
  parties,
  onSaved,
  onCancel,
  onPartyCreated,
  onCategoryCreated,
}: TransactionEditFormProps) {
  const [draft, setDraft] = useState<EditDraft>(() => txToEditDraft(tx))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templateListRefreshKey, setTemplateListRefreshKey] = useState(0)

  const getTemplatePayload = useCallback(
    () => templatePayloadFromDraft(tx.direction, draft),
    [tx.direction, draft],
  )

  useEffect(() => {
    setDraft(txToEditDraft(tx))
    setError(null)
  }, [tx.transactionId])

  const validationError = validateEditItems(
    draft.items.map((i) => ({ amount: i.amount ?? 0 })),
    tx.amount,
    tx.direction,
  )
  const sumOk = isSumMatching(
    draft.items.map((i) => ({ amount: i.amount ?? 0 })),
    tx.amount,
  )

  const paidFromLocked = isOwnSideLocked(tx, 'paidFrom')
  const paidToLocked = isOwnSideLocked(tx, 'paidTo')
  const paidFromParties = filterPartiesForField(parties, tx, 'paidFrom', draft.paidToPartyId)
  const paidToParties = filterPartiesForField(parties, tx, 'paidTo', draft.paidFromPartyId)
  const relevantCategories = filterActiveCategories(categories)

  const manualOwnFrom = tx.source === 'MANUAL' && tx.direction === 'EXPENSE'
  const manualOwnTo = tx.source === 'MANUAL' && tx.direction === 'INCOME'

  const directionLabel = DIRECTION_LABEL_BY_VALUE[tx.direction] ?? tx.direction

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const normalizedItems = draft.items.map((item) => ({
      ...item,
      amount: roundMoneyVal(item.amount ?? 0),
    }))

    const clientError = validateEditItems(
      normalizedItems.map((i) => ({ amount: i.amount ?? 0 })),
      tx.amount,
      tx.direction,
    )
    if (clientError) {
      setError(clientError)
      return
    }

    setSaving(true)
    try {
      const updated = await classifyTransactionItems(tx.transactionId, {
        paidFromPartyId: draft.paidFromPartyId,
        paidToPartyId: draft.paidToPartyId,
        transCustomDescription: draft.transCustomDescription.trim() || null,
        items: normalizedItems.map(
          (item) =>
            ({
              amount: item.amount ?? 0,
              walletId: item.walletId,
              concernId: item.concernId,
              categoryId: item.categoryId,
              description: item.description || null,
            }) as ItemPayload,
        ),
      })
      onSaved(updated)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się zapisać transakcji.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <TransactionTemplateList
        direction={tx.direction}
        refreshKey={templateListRefreshKey}
        onApply={(template) => setDraft((prev) => applyTemplateToDraft(prev, template, tx))}
      />

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{tx.transDate}</span>
          <Pill variant={DIRECTION_PILL[tx.direction]}>{directionLabel}</Pill>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
          {transactionDisplayLabel(tx)}
        </p>
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatAmount(tx.amount)}</p>
      </div>

      {error && <FormError message={error} />}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-5">
        <FieldRow label="Własny opis">
          <input
            type="text"
            className={inputCls}
            value={draft.transCustomDescription}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, transCustomDescription: e.target.value }))
            }
            placeholder="Twój opis, notatka…"
          />
        </FieldRow>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <div className="space-y-3">
          <SectionLabel>Strony transakcji</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Skąd (wpłacający)">
              {paidFromLocked ? (
                <ReadOnlyField
                  value={resolvePartyName(parties, draft.paidFromPartyId)}
                  hint="Ustalone przy imporcie"
                />
              ) : (
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
              )}
            </FieldRow>
            <FieldRow label="Dokąd (odbiorca)">
              {paidToLocked ? (
                <ReadOnlyField
                  value={resolvePartyName(parties, draft.paidToPartyId)}
                  hint="Ustalone przy imporcie"
                />
              ) : (
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
              )}
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
          totalAmount={tx.amount}
          direction={tx.direction}
          allowCategoryQuickAdd
          onCategoryCreated={onCategoryCreated}
        />

        {draft.items.length > 1 && (
          <div
            className={[
              'rounded-lg px-3 py-2 text-xs font-medium',
              sumOk
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
            ].join(' ')}
          >
            Suma pozycji: {formatAmount(draft.items.reduce((s, i) => s + (i.amount ?? 0), 0))} /{' '}
            {formatAmount(tx.amount)}
            {!sumOk && validationError && (
              <span className="block mt-0.5 font-normal opacity-90">{validationError}</span>
            )}
          </div>
        )}
      </div>

      <TransactionTemplateFormFooter
        saving={saving}
        submitLabel="Zapisz"
        submitDisabled={!!validationError}
        onCancel={onCancel}
        getTemplatePayload={getTemplatePayload}
        onTemplateCreated={() => setTemplateListRefreshKey((k) => k + 1)}
      />
    </form>
  )
}

export function TransactionEditBreadcrumb({
  tx,
  onBack,
}: {
  tx: Transaction | null
  onBack: () => void
}) {
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
      <span className="text-gray-600 dark:text-gray-400 font-medium">
        Edycja{tx ? `: ${transactionDisplayLabel(tx)}` : ''}
      </span>
    </nav>
  )
}
