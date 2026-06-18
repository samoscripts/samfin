import type { ClassificationRuleErrorContext } from '@/shared/utils/errors'
import { formatClassificationRuleErrorContext } from '@/shared/utils/errors'

export interface ImportRuleErrorDetailsProps {
  context: ClassificationRuleErrorContext
  className?: string
}

export default function ImportRuleErrorDetails({ context, className }: ImportRuleErrorDetailsProps) {
  const tx = context.transaction
  const directionLabel =
    tx.direction === 'EXPENSE' ? 'wydatek' : tx.direction === 'INCOME' ? 'wpływ' : tx.direction

  return (
    <div
      className={[
        'rounded-lg border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/50',
        'px-4 py-3 text-xs text-red-800 dark:text-red-200 space-y-3 max-w-2xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        <p className="font-semibold text-red-700 dark:text-red-300">Szczegóły błędu reguły</p>
        {tx.lineNo != null && (
          <p className="mt-1 text-red-700/90 dark:text-red-200/90">
            Wiersz CSV {tx.lineNo}: {tx.operationDate ?? '—'}, {directionLabel}, „{tx.description ?? '—'}”
          </p>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-red-600/80 dark:text-red-400/80">Reguła</dt>
        <dd>
          #{context.rule.id ?? '—'} „{context.rule.name}” (priorytet {context.rule.priority})
        </dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Podmiot reguły</dt>
        <dd>{context.rule.partyName ?? '—'}{context.rule.partyId != null ? ` (id=${context.rule.partyId})` : ''}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Skąd przed</dt>
        <dd>{partyLabel(context.assignment.before.paidFrom)}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Dokąd przed</dt>
        <dd>{partyLabel(context.assignment.before.paidTo)}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Skąd w regule</dt>
        <dd>{partyLabel(context.assignment.ruleRequested.paidFrom)}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Dokąd w regule</dt>
        <dd>{partyLabel(context.assignment.ruleRequested.paidTo)}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Skąd po scaleniu</dt>
        <dd>{partyLabel(context.assignment.afterMerge.paidFrom)}</dd>

        <dt className="text-red-600/80 dark:text-red-400/80">Dokąd po scaleniu</dt>
        <dd>{partyLabel(context.assignment.afterMerge.paidTo)}</dd>
      </dl>

      <details className="group">
        <summary className="cursor-pointer text-red-700 dark:text-red-300 hover:underline">
          Pełne dane reguły (JSON)
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-red-100/60 dark:bg-red-900/30 p-2 text-[11px] leading-relaxed whitespace-pre-wrap">
          {formatClassificationRuleErrorContext(context)}
        </pre>
      </details>
    </div>
  )
}

function partyLabel(party: { id: number; name: string | null } | null): string {
  if (!party) return '(brak)'
  if (!party.name) return `id=${party.id}`
  return `${party.name} (id=${party.id})`
}
