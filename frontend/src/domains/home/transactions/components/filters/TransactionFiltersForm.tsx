import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { inputCls } from '@/shared/components/form/formClasses'
import FilterToggleGroup from '@/shared/components/form/FilterToggleGroup'
import { DIRECTION_PILL, STATUS_PILL } from '@/shared/constants/pillMaps'
import type { Direction, Status } from '@/shared/types'
import type { FlowFilters } from '../../types'
import {
  DIRECTION_OPTIONS,
  FILTER_EMPTY_LABEL,
  STATUS_OPTIONS,
} from '../../constants/labels'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import CategorySelect from '@/shared/components/form/CategorySelect'
import { FieldRow, SectionLabel } from '@/shared/components/form/FormSection'

export interface TransactionFiltersFormProps {
  draft: FlowFilters
  onFieldChange: <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => void
  wallets: Wallet[]
  concerns: Concern[]
  categories: Category[]
  paidFromParties: Party[]
  paidToParties: Party[]
}

export default function TransactionFiltersForm({
  draft,
  onFieldChange,
  wallets,
  concerns,
  categories,
  paidFromParties,
  paidToParties,
}: TransactionFiltersFormProps) {
  const activeOnly = <T extends { active?: boolean }>(item: T) => item.active !== false

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      <Section label="Klasyfikacja">
        <FilterToggleGroup
          options={STATUS_OPTIONS}
          value={draft.statuses ?? []}
          onChange={(statuses) =>
            onFieldChange('statuses', statuses.length ? statuses : undefined)
          }
          variantForValue={(v) => STATUS_PILL[v as Status]}
          ariaLabel="Status klasyfikacji"
        />
      </Section>
      <Section label="Okres">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Data od">
            <input
              type="date"
              value={draft.dateFrom ?? ''}
              onChange={(e) => onFieldChange('dateFrom', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Data do">
            <input
              type="date"
              value={draft.dateTo ?? ''}
              onChange={(e) => onFieldChange('dateTo', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>
      <Hr />
      <Section label="Typ operacji">
        <FilterToggleGroup
          options={DIRECTION_OPTIONS}
          value={draft.directions ?? []}
          onChange={(directions) =>
            onFieldChange(
              'directions',
              directions.length ? (directions as FlowFilters['directions']) : undefined,
            )
          }
          variantForValue={(v) => DIRECTION_PILL[v as Direction]}
          ariaLabel="Typ operacji"
        />
      </Section>
      <Section label="Opis">
        <input
          type="search"
          value={draft.description ?? ''}
          onChange={(e) => onFieldChange('description', e.target.value || undefined)}
          placeholder="Szukaj w opisie, tytule, kontrahencie…"
          className={inputCls}
          aria-label="Szukaj w opisie transakcji"
        />
      </Section>
      <Hr />
      <Section label="Kwota (zł)">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Od">
            <input
              type="number"
              min={0}
              placeholder="0,00"
              value={draft.amountMin ?? ''}
              onChange={(e) => onFieldChange('amountMin', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Do">
            <input
              type="number"
              min={0}
              placeholder="∞"
              value={draft.amountMax ?? ''}
              onChange={(e) => onFieldChange('amountMax', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>
      <Hr />
      <div className="space-y-3">
        <SectionLabel>Pozycja</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldRow label="Portfel">
            <DictionarySelect
              items={wallets}
              value={draft.walletId}
              onChange={(v) => onFieldChange('walletId', (v as string) ?? '')}
              emptyLabel={FILTER_EMPTY_LABEL}
              valueType="string"
              filterItem={activeOnly}
            />
          </FieldRow>
          <FieldRow label="Dotyczy">
            <DictionarySelect
              items={concerns}
              value={draft.concernId}
              onChange={(v) => onFieldChange('concernId', (v as string) ?? '')}
              emptyLabel={FILTER_EMPTY_LABEL}
              valueType="string"
              filterItem={activeOnly}
            />
          </FieldRow>
          <FieldRow label="Kategoria">
            <CategorySelect
              categories={categories}
              value={draft.categoryId}
              onChange={(v) => onFieldChange('categoryId', (v as string) ?? '')}
              emptyLabel={FILTER_EMPTY_LABEL}
              valueType="string"
              direction={draft.directions?.length === 1 ? draft.directions[0] : ''}
            />
          </FieldRow>
        </div>
      </div>

      <Hr />
      <div className="space-y-3">
        <SectionLabel>Strony transakcji</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Skąd">
            <DictionarySelect
              items={paidFromParties}
              value={draft.paidFromPartyId}
              onChange={(v) => onFieldChange('paidFromPartyId', (v as string) ?? '')}
              emptyLabel={FILTER_EMPTY_LABEL}
              valueType="string"
            />
          </FieldRow>
          <FieldRow label="Dokąd">
            <DictionarySelect
              items={paidToParties}
              value={draft.paidToPartyId}
              onChange={(v) => onFieldChange('paidToPartyId', (v as string) ?? '')}
              emptyLabel={FILTER_EMPTY_LABEL}
              valueType="string"
            />
          </FieldRow>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

function Hr() {
  return <div className="border-t border-gray-100 dark:border-gray-800" />
}
