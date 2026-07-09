import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/general/parties/types'
import { inputCls } from '@/shared/components/form/formClasses'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import CategorySelect from '@/shared/components/form/CategorySelect'
import { FieldRow, SectionLabel } from '@/shared/components/form/FormSection'
import { FILTER_EMPTY_LABEL } from '@/domains/home/transactions/constants/labels'
import type { RuleListFilters } from '../../types/ruleFilters'

export interface ClassificationRulesFiltersFormProps {
  draft: RuleListFilters
  partyId: number | null
  onPartyIdChange: (partyId: number | null) => void
  onFieldChange: (key: keyof RuleListFilters, value: string | undefined) => void
  ruleContextParties: Party[]
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
}

export default function ClassificationRulesFiltersForm({
  draft,
  partyId,
  onPartyIdChange,
  onFieldChange,
  ruleContextParties,
  wallets,
  concerns,
  categories,
}: ClassificationRulesFiltersFormProps) {
  const activeOnly = <T extends { active?: boolean }>(item: T) => item.active !== false

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      <div className="space-y-3">
        <SectionLabel>Podmiot</SectionLabel>
        <DictionarySelect
          items={ruleContextParties}
          value={partyId}
          onChange={(v) => onPartyIdChange(v as number | null)}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="number"
        />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <div className="space-y-3">
        <SectionLabel>Klasyfikacja w akcjach</SectionLabel>
        <FieldRow label="Portfel">
          <DictionarySelect
            items={wallets}
            value={draft.walletId ? Number(draft.walletId) : null}
            onChange={(v) => onFieldChange('walletId', v != null ? String(v) : undefined)}
            emptyLabel={FILTER_EMPTY_LABEL}
            valueType="number"
            filterItem={activeOnly}
          />
        </FieldRow>
        <FieldRow label="Dotyczy">
          <DictionarySelect
            items={concerns}
            value={draft.concernId ? Number(draft.concernId) : null}
            onChange={(v) => onFieldChange('concernId', v != null ? String(v) : undefined)}
            emptyLabel={FILTER_EMPTY_LABEL}
            valueType="number"
            filterItem={activeOnly}
          />
        </FieldRow>
        <FieldRow label="Kategoria">
          <CategorySelect
            categories={categories}
            value={draft.categoryId ? Number(draft.categoryId) : null}
            onChange={(v) => onFieldChange('categoryId', v != null ? String(v) : undefined)}
            emptyLabel={FILTER_EMPTY_LABEL}
            valueType="number"
          />
        </FieldRow>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <div className="space-y-3">
        <SectionLabel>Reguła</SectionLabel>
        <FieldRow label="Nazwa">
          <input
            type="text"
            className={inputCls}
            value={draft.name ?? ''}
            onChange={(e) => onFieldChange('name', e.target.value || undefined)}
            placeholder="Fragment nazwy reguły"
          />
        </FieldRow>
        <FieldRow label="Opis w warunkach">
          <input
            type="text"
            className={inputCls}
            value={draft.descriptionCondition ?? ''}
            onChange={(e) =>
              onFieldChange('descriptionCondition', e.target.value || undefined)
            }
            placeholder="Fragment wartości warunku description"
          />
        </FieldRow>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
          Szuka w warunkach typu „opis/tytuł transakcji” (pola operation_desc / operation_title w JSON reguły), nie w opisie reguły.
        </p>
      </div>
    </div>
  )
}
