import { Pencil, Trash2 } from 'lucide-react'
import type { ClassificationRule } from '@/shared/api/classificationRules'
import { DIRECTION_LABEL_BY_VALUE } from '@/domains/home/transactions/constants/labels'
import Pill from '@/shared/components/Pill'
import { extractDirectionFromConditions, additionalConditionsCount } from '../ruleConditionMeta'

function formatConditionsSummary(rule: ClassificationRule): string {
  const direction = extractDirectionFromConditions(rule.conditions.conditions)
  const extra = additionalConditionsCount(rule.conditions.conditions)
  const directionLabel = direction ? (DIRECTION_LABEL_BY_VALUE[direction] ?? direction) : '—'
  if (extra === 0) return directionLabel
  return `${directionLabel} · ${extra} dodatk.`
}

export interface ClassificationRulesTableProps {
  rules: ClassificationRule[]
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}

export default function ClassificationRulesTable({
  rules,
  onEdit,
  onDelete,
}: ClassificationRulesTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Priorytet</th>
              <th className="px-4 py-3">Podmiot</th>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Warunki</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {rule.priority}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {rule.partyName ?? '—'}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</p>
                  {rule.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {rule.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatConditionsSummary(rule)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RuleStatusBadge enabled={rule.enabled} />
                </td>
                <td className="px-4 py-3">
                  <RuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {rules.map((rule) => (
          <div key={rule.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{rule.name}</span>
                  <RuleStatusBadge enabled={rule.enabled} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Priorytet: <span className="font-mono">{rule.priority}</span>
                  {' · '}
                  {rule.partyName ?? '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatConditionsSummary(rule)}
                </p>
                {rule.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{rule.description}</p>
                )}
              </div>
              <RuleActions rule={rule} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuleStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Pill variant={enabled ? 'success' : 'neutral'}>
      {enabled ? 'Aktywna' : 'Wyłączona'}
    </Pill>
  )
}

function RuleActions({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ClassificationRule
  onEdit: (rule: ClassificationRule) => void
  onDelete: (rule: ClassificationRule) => void
}) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(rule)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Edytuj"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(rule)}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        aria-label="Usuń"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
