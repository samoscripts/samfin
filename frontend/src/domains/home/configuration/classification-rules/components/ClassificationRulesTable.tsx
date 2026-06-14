import { Pencil, Trash2 } from 'lucide-react'
import type { ClassificationRule } from '@/shared/api/classificationRules'

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
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3">Priorytet</th>
            <th className="px-4 py-3">Podmiot</th>
            <th className="px-4 py-3">Nazwa</th>
            <th className="px-4 py-3">Warunki</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 w-24" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
              <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">{rule.priority}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rule.partyName ?? '—'}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</p>
                {rule.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rule.description}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {rule.conditions.conditions.length} warunków
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    rule.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  ].join(' ')}
                >
                  {rule.enabled ? 'Aktywna' : 'Wyłączona'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(rule)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Edytuj"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rule)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label="Usuń"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
