import { Plus, Trash2 } from 'lucide-react'
import type { Direction } from '@/shared/types'
import type { Category } from '@/shared/api/categories'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import CategorySelect from '@/shared/components/form/CategorySelect'
import MoneyAmountInput from '@/shared/components/form/MoneyAmountInput'
import {
  FieldRow,
  SectionLabel,
  readOnlyFieldCls,
  splitInputCls,
} from '@/shared/components/form/FormSection'
import {
  DEFAULT_SPLIT_PERCENT,
  MAX_SPLIT_ITEMS,
  MIN_SPLIT_ITEMS,
  allocateAmountsFromPercents,
  clampPercent,
  roundMoney,
  syncPercentPair,
} from '@/shared/utils/splitAllocation'
import { EDIT_EMPTY_LABEL } from '@/domains/home/transactions/constants/labels'

export interface ClassificationItemDraft {
  walletId: number | null
  concernId: number | null
  categoryId: number | null
  description?: string
  /** Transaction mode only */
  amount?: number
  /** Split percent (0–100 integer); item 0 editable when 2 items */
  percent?: number
}

export interface ClassificationItemsEditorProps {
  mode: 'rule' | 'transaction'
  items: ClassificationItemDraft[]
  onChange: (items: ClassificationItemDraft[]) => void
  wallets: { id: number; name: string; active?: boolean }[]
  concerns: { id: number; name: string; active?: boolean }[]
  categories: Category[]
  /** Required for transaction mode */
  totalAmount?: number
  direction?: Direction
  emptyDictLabel?: string
  readOnly?: boolean
  showSectionLabel?: boolean
  allowCategoryQuickAdd?: boolean
  onCategoryCreated?: (category: Category) => void
}

export default function ClassificationItemsEditor({
  mode,
  items,
  onChange,
  wallets,
  concerns,
  categories,
  totalAmount = 0,
  direction = 'EXPENSE',
  emptyDictLabel = EDIT_EMPTY_LABEL,
  readOnly = false,
  showSectionLabel = true,
  allowCategoryQuickAdd = false,
  onCategoryCreated,
}: ClassificationItemsEditorProps) {
  const isSplit = items.length > 1

  function setItem(index: number, patch: Partial<ClassificationItemDraft>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleAddItem() {
    if (items.length >= MAX_SPLIT_ITEMS) return

    if (mode === 'rule') {
      onChange([
        { ...items[0], percent: DEFAULT_SPLIT_PERCENT },
        { walletId: null, concernId: null, categoryId: null, percent: DEFAULT_SPLIT_PERCENT },
      ])
      return
    }

    const [first, second] = allocateAmountsFromPercents(totalAmount, [
      DEFAULT_SPLIT_PERCENT,
      DEFAULT_SPLIT_PERCENT,
    ])
    onChange([
      { ...items[0], amount: first, percent: DEFAULT_SPLIT_PERCENT },
      {
        walletId: null,
        concernId: null,
        categoryId: null,
        amount: second,
        percent: DEFAULT_SPLIT_PERCENT,
      },
    ])
  }

  function handleRemoveItem(index: number) {
    if (items.length <= MIN_SPLIT_ITEMS) return
    const remaining = items.filter((_, i) => i !== index)
    if (mode === 'transaction') {
      remaining[0] = { ...remaining[0], amount: totalAmount, percent: 100 }
    } else {
      remaining[0] = { ...remaining[0], percent: 100 }
    }
    onChange(remaining)
  }

  function handlePercentChange(index: 0 | 1, raw: string) {
    const parsed = raw === '' ? 0 : Number(raw)
    const [p0, p1] = syncPercentPair(index, parsed)

    if (mode === 'rule') {
      onChange([
        { ...items[0], percent: p0 },
        { ...items[1], percent: p1 },
      ])
      return
    }

    const [a0, a1] = allocateAmountsFromPercents(totalAmount, [p0, p1])
    onChange([
      { ...items[0], percent: p0, amount: a0 },
      { ...items[1], percent: p1, amount: a1 },
    ])
  }

  function handleAmountChange(changedIndex: 0 | 1, signedAmount: number | null) {
    if (signedAmount === null) return

    const parsed = roundMoney(signedAmount)
    const otherIndex = changedIndex === 0 ? 1 : 0
    const otherAmount = roundMoney(totalAmount - parsed)
    const next = [...items] as [ClassificationItemDraft, ClassificationItemDraft]
    next[changedIndex] = { ...next[changedIndex], amount: parsed }
    next[otherIndex] = { ...next[otherIndex], amount: otherAmount }

    const percents = inferPercentsFromAmountsLocal(totalAmount, [next[0].amount ?? 0, next[1].amount ?? 0])
    next[0] = { ...next[0], percent: percents[0] }
    next[1] = { ...next[1], percent: percents[1] }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {showSectionLabel ? <SectionLabel>Klasyfikacja</SectionLabel> : <span />}
        {items.length < MAX_SPLIT_ITEMS && !readOnly && (
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#1c4230] dark:text-[#c9a96e] border border-[#c9a96e]/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          >
            <Plus size={12} />
            Dodaj pozycję
          </button>
        )}
      </div>

      {items.map((item, i) => (
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
                {mode === 'transaction' && (
                  <div className="w-28">
                    <MoneyAmountInput
                      value={item.amount}
                      direction={direction}
                      showSignPrefix={direction === 'EXPENSE'}
                      onChange={(signed) => handleAmountChange(i as 0 | 1, signed)}
                      inputClassName={splitInputCls}
                      disabled={readOnly}
                    />
                  </div>
                )}
                <div className="w-16">
                  {i === 0 ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={item.percent ?? DEFAULT_SPLIT_PERCENT}
                      onChange={(e) => handlePercentChange(0, e.target.value)}
                      className={splitInputCls}
                      title="Procent"
                      disabled={readOnly}
                    />
                  ) : (
                    <div className={`${readOnlyFieldCls} text-center font-mono`}>
                      {item.percent ?? DEFAULT_SPLIT_PERCENT}%
                    </div>
                  )}
                </div>
                {items.length > MIN_SPLIT_ITEMS && !readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(i)}
                    title="Usuń pozycję"
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRow label="Portfel">
              <DictionarySelect
                items={wallets}
                value={item.walletId}
                onChange={(v) => setItem(i, { walletId: v as number | null })}
                emptyLabel={emptyDictLabel}
                valueType="number"
                filterItem={(w) => w.active !== false}
                disabled={readOnly}
              />
            </FieldRow>

            <FieldRow label="Dotyczy">
              <DictionarySelect
                items={concerns}
                value={item.concernId}
                onChange={(v) => setItem(i, { concernId: v as number | null })}
                emptyLabel={emptyDictLabel}
                valueType="number"
                filterItem={(c) => c.active !== false}
                disabled={readOnly}
              />
            </FieldRow>

            <FieldRow label="Kategoria">
              <CategorySelect
                categories={categories}
                value={item.categoryId}
                onChange={(v) => setItem(i, { categoryId: v as number | null })}
                emptyLabel={emptyDictLabel}
                valueType="number"
                direction={direction}
                disabled={readOnly}
                allowQuickAdd={allowCategoryQuickAdd}
                onCategoryCreated={onCategoryCreated}
              />
            </FieldRow>
          </div>
        </div>
      ))}
    </div>
  )
}

function inferPercentsFromAmountsLocal(totalAmount: number, amounts: number[]): [number, number] {
  const absTotal = Math.abs(totalAmount)
  if (absTotal === 0) return [DEFAULT_SPLIT_PERCENT, DEFAULT_SPLIT_PERCENT]
  const p0 = clampPercent(Math.round((Math.abs(amounts[0]) / absTotal) * 100))
  return [p0, 100 - p0]
}
