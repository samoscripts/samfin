import type { Wallet } from '@/shared/api/wallets'
import type { Concern } from '@/shared/api/concerns'
import type { Category } from '@/shared/api/categories'
import type { Party } from '@/domains/home/configuration/parties/types'
import Select from '@/shared/components/form/Select'
import { inputCls } from '@/shared/components/form/formClasses'
import type { FlowFilters } from '../../types'
import {
  DIRECTION_OPTIONS,
  FILTER_EMPTY_LABEL,
  STATUS_OPTIONS,
} from '../../constants/labels'
import DictionarySelect from '../selects/DictionarySelect'

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
        <Select
          value={draft.direction ?? ''}
          onChange={(e) => onFieldChange('direction', e.target.value as FlowFilters['direction'])}
        >
          <option value="">{FILTER_EMPTY_LABEL}</option>
          {DIRECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
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
      <Section label="Portfel">
        <DictionarySelect
          items={wallets}
          value={draft.walletId}
          onChange={(v) => onFieldChange('walletId', (v as string) ?? '')}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="string"
          filterItem={activeOnly}
        />
      </Section>
      <Section label="Dotyczy">
        <DictionarySelect
          items={concerns}
          value={draft.concernId}
          onChange={(v) => onFieldChange('concernId', (v as string) ?? '')}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="string"
          filterItem={activeOnly}
        />
      </Section>
      <Section label="Kategoria">
        <DictionarySelect
          items={categories}
          value={draft.categoryId}
          onChange={(v) => onFieldChange('categoryId', (v as string) ?? '')}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="string"
          filterItem={(c) => activeOnly(c)}
          getLabel={(c) => c.name}
        />
      </Section>
      <Section label="Status">
        <Select
          value={draft.status ?? ''}
          onChange={(e) => onFieldChange('status', e.target.value)}
        >
          <option value="">{FILTER_EMPTY_LABEL}</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Section>
      <Hr />
      <Section label="Skąd">
        <DictionarySelect
          items={paidFromParties}
          value={draft.paidFromPartyId}
          onChange={(v) => onFieldChange('paidFromPartyId', (v as string) ?? '')}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="string"
        />
      </Section>
      <Section label="Dokąd">
        <DictionarySelect
          items={paidToParties}
          value={draft.paidToPartyId}
          onChange={(v) => onFieldChange('paidToPartyId', (v as string) ?? '')}
          emptyLabel={FILTER_EMPTY_LABEL}
          valueType="string"
        />
      </Section>
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
