import { useEffect, useMemo, useState } from 'react'

import {
  createClassificationRule,
  updateClassificationRule,
  type ClassificationRule,
  type RuleActionsPayload,
  type RuleCondition,
} from '@/shared/api/classificationRules'

import type { Party } from '@/domains/home/configuration/parties/types'
import type { Category } from '@/shared/api/categories'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import { FormSection, ReadOnlyField } from '@/shared/components/form/FormSection'
import ToggleSwitch from '@/shared/components/form/ToggleSwitch'
import { btnSecondary, configInputCls, configSelectCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'
import { validatePercents } from '@/shared/utils/splitAllocation'

import {
  applyOwnSideToActions,
  defaultForm,
  ruleToForm,
  type FormState,
} from '../constants'
import {
  ensureDirectionCondition,
  extractDirectionFromConditions,
  validateConditions,
} from '../ruleConditionMeta'
import RuleActionsEditor from './RuleActionsEditor'
import RuleConditionsEditor from './RuleConditionsEditor'
import type { RuleFromTransactionDraft, TransactionConditionSeeds } from '../utils/ruleFromTransaction'
import { nextRulePriority } from '../utils/ruleFilters'

const priorityInputCls = [
  configInputCls,
  'w-20 text-center font-mono tabular-nums',
].join(' ')

export interface ClassificationRuleFormProps {
  rule: ClassificationRule | null
  initialDraft?: RuleFromTransactionDraft | null
  allRules?: ClassificationRule[]
  ruleContextParties: Party[]
  parties: Party[]
  wallets: { id: number; name: string }[]
  concerns: { id: number; name: string }[]
  categories: Category[]
  onSaved: () => void
  onCancel: () => void
  onPartyCreated?: (party: Party) => void
  onCategoryCreated?: (category: Category) => void
}

function siblingPriorities(
  allRules: ClassificationRule[],
  partyId: number | null,
  excludeRuleId: number | null,
): number[] {
  if (partyId === null) return []
  return allRules
    .filter((r) => r.partyId === partyId && r.active && r.id !== excludeRuleId)
    .map((r) => r.priority)
}

function initialFormState(
  rule: ClassificationRule | null,
  initialDraft: RuleFromTransactionDraft | null,
): FormState {
  if (rule) return ruleToForm(rule)
  if (initialDraft) return initialDraft.form
  return defaultForm()
}

export default function ClassificationRuleForm({
  rule,
  initialDraft = null,
  allRules = [],
  ruleContextParties,
  parties,
  wallets,
  concerns,
  categories,
  onSaved,
  onCancel,
  onPartyCreated,
  onCategoryCreated,
}: ClassificationRuleFormProps) {
  const isEdit = rule !== null
  const fromTransaction = initialDraft !== null

  const [contextPartyId, setContextPartyId] = useState<number | null>(() => {
    if (isEdit) return rule.partyId
    if (initialDraft) return initialDraft.contextPartyId
    return ruleContextParties[0]?.id ?? null
  })

  const [form, setForm] = useState<FormState>(() => initialFormState(rule, initialDraft))

  const [transactionSeeds, setTransactionSeeds] = useState<TransactionConditionSeeds>(() =>
    initialDraft?.transactionSeeds ?? { description: false, counterparty: false },
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const direction = extractDirectionFromConditions(form.conditions.conditions)
  const formReady = contextPartyId !== null && direction !== ''
  const contextPartyName =
    contextPartyId !== null
      ? (ruleContextParties.find((p) => p.id === contextPartyId)?.name ?? '—')
      : '—'

  const priorities = useMemo(
    () => siblingPriorities(allRules, contextPartyId, rule?.id ?? null),
    [allRules, contextPartyId, rule?.id],
  )

  const firstPriority = priorities.length > 0 ? Math.min(...priorities) - 1 : 1
  const lastPriority = nextRulePriority(
    allRules.filter((r) => r.partyId === contextPartyId && r.active && r.id !== (rule?.id ?? null)),
  )

  useEffect(() => {
    if (isEdit || fromTransaction) return
    if (contextPartyId === null) return
    const siblings = allRules.filter((r) => r.partyId === contextPartyId && r.active)
    setForm((f) => ({ ...f, priority: nextRulePriority(siblings) }))
  }, [contextPartyId, isEdit, fromTransaction, allRules])

  useEffect(() => {
    if (!formReady || contextPartyId === null) {
      return
    }
    setForm((f) => ({
      ...f,
      actions: applyOwnSideToActions(f.actions, direction, contextPartyId),
    }))
  }, [contextPartyId, direction, formReady])

  function setConditions(conditions: RuleCondition[]) {
    setForm((f) => ({
      ...f,
      conditions: { conditions: ensureDirectionCondition(conditions) },
    }))
  }

  function setActions(actions: RuleActionsPayload) {
    setForm((f) => ({ ...f, actions }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (contextPartyId === null) {
      setError('Wybierz podmiot reguły.')
      return
    }

    const normalizedConditions = ensureDirectionCondition(form.conditions.conditions)
    const saveDirection = extractDirectionFromConditions(normalizedConditions)
    if (saveDirection === '') {
      setError('Wybierz kierunek transakcji w warunkach.')
      return
    }

    if (!form.name.trim()) {
      setError('Podaj nazwę reguły.')
      return
    }

    const conditionsError = validateConditions(normalizedConditions)
    if (conditionsError) {
      setError(conditionsError)
      return
    }

    const percents = form.actions.items.map((item) => item.percent)
    const percentsError = validatePercents(percents)
    if (percentsError) {
      setError(percentsError)
      return
    }

    setSaving(true)
    try {
      const payload: FormState = {
        ...form,
        conditions: { conditions: normalizedConditions },
        actions: applyOwnSideToActions(form.actions, saveDirection, contextPartyId),
      }

      if (isEdit) {
        await updateClassificationRule(rule.partyId, rule.id, {
          ...payload,
          ...(contextPartyId !== rule.partyId ? { partyId: contextPartyId } : {}),
        })
      } else {
        await createClassificationRule(contextPartyId, {
          ...payload,
          createdFromTransactionId: initialDraft?.createdFromTransactionId ?? null,
        })
      }
      onSaved()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nie udało się zapisać reguły.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <FormError message={error} />}

      <FormField label="Podmiot (własna strona transakcji)" required>
        {fromTransaction ? (
          <ReadOnlyField value={contextPartyName} />
        ) : (
          <DictionarySelect
            items={ruleContextParties}
            value={contextPartyId}
            onChange={(v) => setContextPartyId(v === null ? null : Number(v))}
            emptyLabel="— wybierz podmiot —"
            valueType="number"
            className={configSelectCls}
          />
        )}
      </FormField>

      {contextPartyId !== null && (
        <FormSection title="Warunki">
          <RuleConditionsEditor
            conditions={form.conditions.conditions}
            onChange={setConditions}
            fromTransaction={fromTransaction}
            transactionSeeds={fromTransaction ? transactionSeeds : undefined}
            onTransactionSeedsChange={fromTransaction ? setTransactionSeeds : undefined}
          />
        </FormSection>
      )}

      {contextPartyId !== null && !formReady && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Wybierz kierunek transakcji, aby skonfigurować pozostałe pola reguły.
        </p>
      )}

      <fieldset
        disabled={!formReady}
        className={[
          'space-y-4 border-0 p-0 m-0 min-w-0',
          !formReady ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nazwa" required>
            <input
              className={configInputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>

          <FormField label="Opis (opcjonalnie)">
            <input
              className={configInputCls}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              placeholder="Krótki opis reguły"
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 pt-2">
          <FormField label="Priorytet">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={priorityInputCls}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              />
              <button
                type="button"
                className={[btnSecondary, 'px-3 py-2 text-xs whitespace-nowrap'].join(' ')}
                onClick={() => setForm((f) => ({ ...f, priority: firstPriority }))}
                title="Najwyższy priorytet (wykonywana jako pierwsza)"
              >
                Pierwszy
              </button>
              <button
                type="button"
                className={[btnSecondary, 'px-3 py-2 text-xs whitespace-nowrap'].join(' ')}
                onClick={() => setForm((f) => ({ ...f, priority: lastPriority }))}
                title="Najniższy priorytet (wykonywana jako ostatnia)"
              >
                Ostatni
              </button>
            </div>
          </FormField>

          <div className="flex flex-wrap items-center gap-6 sm:pb-2">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <ToggleSwitch
                checked={form.enabled}
                onChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
                label="Aktywna"
              />
              Aktywna
            </label>
            <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <ToggleSwitch
                checked={form.stopOnMatch}
                onChange={(stopOnMatch) => setForm((f) => ({ ...f, stopOnMatch }))}
                label="Zatrzymaj po dopasowaniu"
              />
              Zatrzymaj po dopasowaniu
            </label>
          </div>
        </div>

        <FormSection title="Klasyfikacja">
          <RuleActionsEditor
            actions={form.actions}
            direction={direction}
            contextPartyId={contextPartyId}
            ruleContextParties={ruleContextParties}
            parties={parties}
            wallets={wallets}
            concerns={concerns}
            categories={categories}
            onChange={setActions}
            actionsLocked={fromTransaction}
            onPartyCreated={onPartyCreated}
            onCategoryCreated={onCategoryCreated}
          />
        </FormSection>

        <FormActions saving={saving} submitLabel="Zapisz" submitDisabled={!formReady} onCancel={onCancel} />
      </fieldset>
    </form>
  )
}
