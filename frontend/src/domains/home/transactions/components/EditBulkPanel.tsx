import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Transaction } from '@/shared/types'
import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/general/parties/types'
import {
  bulkUpdateTransactions,
  type BulkUpdateField,
  type BulkUpdateIdField,
} from '@/shared/api/transactions'
import {
  filterPartiesForField,
  isPartyFieldBulkBlocked,
} from '../utils/partyAssignment'
import Pill from '@/shared/components/Pill'
import { DIRECTION_PILL } from '@/shared/constants/pillMaps'
import { DIRECTION_LABEL_BY_VALUE, EDIT_EMPTY_LABEL } from '../constants/labels'
import { formatCategoryLabel } from '../utils/categoryOptions'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import CategorySelect from '@/shared/components/form/CategorySelect'
import PartySelect from '@/shared/components/form/PartySelect'
import FormError from '@/shared/components/form/FormError'
import { SectionLabel } from '@/shared/components/form/FormSection'
import { inputCls, selectCls } from '@/shared/components/form/formClasses'
import {
  TransactionTemplateFormFooter,
  TransactionTemplateList,
} from './TransactionTemplateBar'
import {
  applyTemplateToBulkDraft,
  bulkTemplatePayloadFromDraft,
  type BulkClassificationDraft,
} from '../utils/transactionTemplates'

const ID_FIELD_DEFS: { key: BulkUpdateIdField; label: string }[] = [
  { key: 'paidFromPartyId', label: 'Skąd' },
  { key: 'paidToPartyId', label: 'Dokąd' },
  { key: 'walletId', label: 'Portfel' },
  { key: 'concernId', label: 'Dotyczy' },
  { key: 'categoryId', label: 'Kategoria' },
]

const TEXT_FIELD = { key: 'transCustomDescription' as const, label: 'Własny opis' }

const EMPTY_DRAFT = (): BulkClassificationDraft => ({
  paidFromPartyId: { enabled: false, value: null },
  paidToPartyId: { enabled: false, value: null },
  walletId: { enabled: false, value: null },
  concernId: { enabled: false, value: null },
  categoryId: { enabled: false, value: null },
  transCustomDescription: { enabled: false, value: '' },
})

function isDraftDirty(draft: BulkClassificationDraft): boolean {
  return (
    ID_FIELD_DEFS.some((f) => draft[f.key].enabled) || draft.transCustomDescription.enabled
  )
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
  onPartyCreated?: (party: Party) => void
  onCategoryCreated?: (category: Category) => void
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
  onPartyCreated,
  onCategoryCreated,
}: EditBulkPanelProps) {
  const [draft, setDraft] = useState<BulkClassificationDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [templateListRefreshKey, setTemplateListRefreshKey] = useState(0)

  const direction = transactions[0]?.direction ?? 'EXPENSE'
  const directionLabel = DIRECTION_LABEL_BY_VALUE[direction] ?? direction

  const enabledIdFields = useMemo(
    () => ID_FIELD_DEFS.filter((f) => draft[f.key].enabled),
    [draft],
  )

  const canSave = enabledIdFields.length > 0 || draft.transCustomDescription.enabled

  const getTemplatePayload = useCallback(
    () => bulkTemplatePayloadFromDraft(direction, draft),
    [direction, draft],
  )

  useEffect(() => {
    setDraft(EMPTY_DRAFT())
    setError(null)
    setSavedOk(false)
  }, [transactions.map((t) => t.transactionId).join(',')])

  useEffect(() => {
    onDirtyChange(isDraftDirty(draft))
  }, [draft, onDirtyChange])

  const setFieldEnabled = useCallback((key: BulkUpdateIdField, enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled },
    }))
    setError(null)
  }, [])

  const setFieldValue = useCallback((key: BulkUpdateIdField, value: number | null) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    const fields: BulkUpdateField[] = [
      ...ID_FIELD_DEFS.filter((f) => draft[f.key].enabled).map((f) => f.key),
      ...(draft.transCustomDescription.enabled ? [TEXT_FIELD.key] : []),
    ]
    if (fields.length === 0) {
      const msg = 'Wybierz co najmniej jedno pole do aktualizacji.'
      setError(msg)
      throw new Error(msg)
    }

    const values: Partial<Record<BulkUpdateField, number | string | null>> = {}
    for (const key of ID_FIELD_DEFS.map((f) => f.key)) {
      if (draft[key].enabled) {
        values[key] = draft[key].value
      }
    }
    if (draft.transCustomDescription.enabled) {
      values.transCustomDescription = draft.transCustomDescription.value.trim() || null
    }

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

  const manualOwnFrom =
    bulkTxContext.source === 'MANUAL' && direction === 'EXPENSE'
  const manualOwnTo =
    bulkTxContext.source === 'MANUAL' && direction === 'INCOME'

  const previewLines = [
    ...enabledIdFields.map((f) => {
      const val = draft[f.key].value
      const display = resolveIdFieldDisplay(f.key, val, wallets, concerns, categories, parties)
      return { label: f.label, display }
    }),
    ...(draft.transCustomDescription.enabled
      ? [
          {
            label: TEXT_FIELD.label,
            display: draft.transCustomDescription.value.trim() || EDIT_EMPTY_LABEL,
          },
        ]
      : []),
  ]

  const countLabel =
    transactions.length === 1
      ? '1 transakcja'
      : transactions.length < 5
        ? `${transactions.length} transakcje`
        : `${transactions.length} transakcji`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSaveClick()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TransactionTemplateList
        direction={direction}
        refreshKey={templateListRefreshKey}
        onApply={(template) => {
          setDraft((prev) => applyTemplateToBulkDraft(prev, template, transactions))
          setError(null)
        }}
      />

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Edycja zbiorcza
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{countLabel}</p>
          </div>
          <Pill variant={DIRECTION_PILL[direction]}>{directionLabel}</Pill>
        </div>
      </div>

      {error && <FormError message={error} />}
      {savedOk && !error && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Zaktualizowano pomyślnie
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-5">
        <div className="space-y-3">
          <SectionLabel>Pola do nadpisania</SectionLabel>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Zaznacz pola, które chcesz ustawić dla wszystkich wybranych transakcji.
          </p>

          {ID_FIELD_DEFS.map((field) => {
            const partyBlocked =
              (field.key === 'paidFromPartyId' && paidFromBlocked) ||
              (field.key === 'paidToPartyId' && paidToBlocked)

            return (
              <div key={field.key} className="space-y-1.5">
                <label
                  className={[
                    'flex items-center gap-2',
                    partyBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
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
                      <PartySelect
                        parties={paidFromParties}
                        value={draft[field.key].value}
                        onChange={(partyId) => {
                          setDraft((prev) => ({
                            ...prev,
                            paidFromPartyId: { ...prev.paidFromPartyId, value: partyId },
                            paidToPartyId:
                              prev.paidToPartyId.value === partyId
                                ? { ...prev.paidToPartyId, value: null }
                                : prev.paidToPartyId,
                          }))
                          setError(null)
                        }}
                        emptyLabel={EDIT_EMPTY_LABEL}
                        className={selectCls}
                        excludePartyId={
                          draft.paidToPartyId.enabled ? draft.paidToPartyId.value : null
                        }
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
                    {field.key === 'paidToPartyId' && (
                      <PartySelect
                        parties={paidToParties}
                        value={draft[field.key].value}
                        onChange={(partyId) => {
                          setDraft((prev) => ({
                            ...prev,
                            paidToPartyId: { ...prev.paidToPartyId, value: partyId },
                            paidFromPartyId:
                              prev.paidFromPartyId.value === partyId
                                ? { ...prev.paidFromPartyId, value: null }
                                : prev.paidFromPartyId,
                          }))
                          setError(null)
                        }}
                        emptyLabel={EDIT_EMPTY_LABEL}
                        className={selectCls}
                        excludePartyId={
                          draft.paidFromPartyId.enabled ? draft.paidFromPartyId.value : null
                        }
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
                      <CategorySelect
                        categories={categories}
                        value={draft[field.key].value}
                        onChange={(v) => setFieldValue(field.key, v as number | null)}
                        emptyLabel={EDIT_EMPTY_LABEL}
                        valueType="number"
                        direction={direction}
                        allowQuickAdd
                        onCategoryCreated={onCategoryCreated}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.transCustomDescription.enabled}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    transCustomDescription: {
                      ...prev.transCustomDescription,
                      enabled: e.target.checked,
                    },
                  }))
                  setError(null)
                }}
                className="rounded border-gray-300 dark:border-gray-600 text-[#1c4230] focus:ring-[#c9a96e]/40"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {TEXT_FIELD.label}
              </span>
            </label>
            {draft.transCustomDescription.enabled && (
              <div className="pl-6">
                <input
                  type="text"
                  className={inputCls}
                  value={draft.transCustomDescription.value}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      transCustomDescription: {
                        ...prev.transCustomDescription,
                        value: e.target.value,
                      },
                    }))
                    setError(null)
                  }}
                  placeholder="Twój opis, notatka…"
                />
              </div>
            )}
          </div>
        </div>

        {(enabledIdFields.length > 0 || draft.transCustomDescription.enabled) && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <div className="space-y-2">
              <SectionLabel>Podgląd zmian</SectionLabel>
              <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 space-y-1">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Zostanie zaktualizowanych:{' '}
                  <span className="font-semibold">{transactions.length}</span>{' '}
                  {transactions.length === 1 ? 'transakcja' : 'transakcji'}
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

      <TransactionTemplateFormFooter
        saving={saving}
        submitLabel="Zastosuj"
        submitDisabled={!canSave}
        onCancel={onCancelClick}
        getTemplatePayload={getTemplatePayload}
        onTemplateCreated={() => setTemplateListRefreshKey((k) => k + 1)}
      />
    </form>
  )
}

function resolveIdFieldDisplay(
  key: BulkUpdateIdField,
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
