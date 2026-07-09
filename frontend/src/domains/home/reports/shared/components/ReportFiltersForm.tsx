import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import { inputCls } from '@/shared/components/form/formClasses'
import type { FlowFilters } from '@/domains/home/transactions/types'
import { FILTER_EMPTY_LABEL } from '@/domains/home/transactions/constants/labels'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import CategorySelect from '@/shared/components/form/CategorySelect'
import type { BreakdownDirections } from '@/domains/home/reports/shared/types/breakdown'
import { FieldRow, SectionLabel } from '@/shared/components/form/FormSection'

export interface ReportFiltersFormProps {
  draft: FlowFilters
  onFieldChange: <K extends keyof FlowFilters>(key: K, value: FlowFilters[K]) => void
  concerns: Concern[]
  categories: Category[]
  paidFromParties: Party[]
  paidToParties: Party[]
  reportDirections?: BreakdownDirections
  categorySelectDirection?: 'EXPENSE' | 'INCOME' | ''
}

export default function ReportFiltersForm({
  draft,
  onFieldChange,
  concerns,
  categories,
  paidFromParties,
  paidToParties,
  reportDirections,
  categorySelectDirection,
}: ReportFiltersFormProps) {
  const activeOnly = <T extends { active?: boolean }>(item: T) => item.active !== false

  return (
    <div className="space-y-5">
      <Section label="Opis">
        <input
          type="search"
          value={draft.description ?? ''}
          onChange={(e) => onFieldChange('description', e.target.value || undefined)}
          placeholder="Szukaj w opisie, tytule, własnym opisie, kontrahencie…"
          className={inputCls}
          aria-label="Szukaj w opisie transakcji"
        />
      </Section>

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

      <div className="space-y-3">
        <SectionLabel>Pozycja</SectionLabel>
        <div className="grid grid-cols-1 gap-3">
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
              direction={categorySelectDirection ?? reportDirections?.[0] ?? ''}
            />
          </FieldRow>
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabel>Strony transakcji</SectionLabel>
        <div className="grid grid-cols-1 gap-3">
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
