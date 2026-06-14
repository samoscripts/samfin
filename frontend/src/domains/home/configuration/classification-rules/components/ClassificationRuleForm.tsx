import { useEffect, useState } from 'react'
import {
  createClassificationRule,
  updateClassificationRule,
  type ClassificationRule,
  type RuleActionsPayload,
  type RuleCondition,
} from '@/shared/api/classificationRules'
import type { Party } from '@/domains/home/configuration/parties/types'
import { DIRECTION_OPTIONS } from '@/domains/home/transactions/constants/labels'
import DictionarySelect from '@/shared/components/form/DictionarySelect'
import FormActions from '@/shared/components/form/FormActions'
import FormError from '@/shared/components/form/FormError'
import FormField from '@/shared/components/form/FormField'
import Select from '@/shared/components/form/Select'
import { configInputCls, configSelectCls, textareaCls } from '@/shared/components/form/formClasses'
import { getApiErrorMessage } from '@/shared/utils/errors'
import {
  applyOwnSideToActions,
  defaultForm,
  inferDirectionFromRule,
  ruleToForm,
  type FormState,
  type RuleDirection,
} from '../constants'
import { validateConditions } from '../ruleConditionMeta'
import RuleActionsEditor from './RuleActionsEditor'
import RuleConditionsEditor from './RuleConditionsEditor'

export interface ClassificationRuleFormProps {
  rule: ClassificationRule | null
  ruleContextParties: Party[]
  parties: Party[]
  wallets: { id: number; name: string }[]
  concerns: { id: number; name: string }[]
  categories: { id: number; name: string }[]
  onSaved: () => void
  onCancel: () => void
}

export default function ClassificationRuleForm({
  rule,
  ruleContextParties,
  parties,
  wallets,
  concerns,
  categories,
  onSaved,
  onCancel,
}: ClassificationRuleFormProps) {
  const isEdit = rule !== null

  const [contextPartyId, setContextPartyId] = useState<number | null>(() =>
    isEdit ? rule.partyId : (ruleContextParties[0]?.id ?? null),
  )
  const [direction, setDirection] = useState<RuleDirection>(() =>
    isEdit ? inferDirectionFromRule(rule) : '',
  )
  const [form, setForm] = useState<FormState>(() => (rule ? ruleToForm(rule) : defaultForm()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formReady = contextPartyId !== null && direction !== ''

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
    setForm((f) => ({ ...f, conditions: { conditions } }))
  }

  function setActions(actions: RuleActionsPayload) {
    setForm((f) => ({ ...f, actions }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formReady || contextPartyId === null) {
      setError('Wybierz podmiot i kierunek transakcji.')
      return
    }

    if (!form.name.trim()) {
      setError('Podaj nazwę reguły.')
      return
    }

    const conditionsError = validateConditions(form.conditions.conditions)
    if (conditionsError) {
      setError(conditionsError)
      return
    }

    setSaving(true)
    try {
      const payload: FormState = {
        ...form,
        actions: applyOwnSideToActions(form.actions, direction, contextPartyId),
      }

      if (isEdit) {
        await updateClassificationRule(rule.partyId, rule.id, {
          ...payload,
          ...(contextPartyId !== rule.partyId ? { partyId: contextPartyId } : {}),
        })
      } else {
        await createClassificationRule(contextPartyId, payload)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Podmiot (własna strona transakcji)" required>
          <DictionarySelect
            items={ruleContextParties}
            value={contextPartyId}
            onChange={(v) => setContextPartyId(v === null ? null : Number(v))}
            emptyLabel="— wybierz podmiot —"
            valueType="number"
            className={configSelectCls}
          />
        </FormField>
        <FormField label="Kierunek" required>
          <Select
            className={configSelectCls}
            value={direction}
            onChange={(e) => setDirection(e.target.value as RuleDirection)}
          >
            <option value="">— wybierz kierunek —</option>
            {DIRECTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {!formReady && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Wybierz podmiot i kierunek, aby skonfigurować regułę.
        </p>
      )}

      <fieldset
        disabled={!formReady}
        className={[
          'space-y-4 border-0 p-0 m-0 min-w-0',
          !formReady ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nazwa" required className="sm:col-span-2">
            <input
              className={configInputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Opis (opcjonalnie)" className="sm:col-span-2">
            <textarea
              className={textareaCls}
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
            />
          </FormField>
          <FormField label="Priorytet">
            <input
              type="number"
              className={configInputCls}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            />
          </FormField>
          <div className="flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              Aktywna
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.stopOnMatch}
                onChange={(e) => setForm((f) => ({ ...f, stopOnMatch: e.target.checked }))}
              />
              Zatrzymaj po dopasowaniu
            </label>
          </div>
        </div>

        <RuleConditionsEditor
          conditions={form.conditions.conditions}
          onChange={setConditions}
        />

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
        />

        <FormActions saving={saving} submitLabel="Zapisz" submitDisabled={!formReady} onCancel={onCancel} />
      </fieldset>
    </form>
  )
}
