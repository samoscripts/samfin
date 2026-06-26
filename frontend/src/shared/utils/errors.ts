type ApiErrorBody = {
  message?: string
  detail?: string
  context?: ImportErrorContext
}

export interface PartyRef {
  id: number
  name: string | null
}

export interface ClassificationRuleErrorContext {
  type?: 'classification_rule'
  cause: string
  rule: {
    id: number | null
    name: string
    priority: number
    partyId: number | null
    partyName: string | null
    conditions: Record<string, unknown>
    actions: Record<string, unknown>
  }
  transaction: {
    lineNo: number | null
    transTitle: string | null
    transDescription: string | null
    transDate: string | null
    direction: string
    amountMinor: number
    source: string
  }
  assignment: {
    before: { paidFrom: PartyRef | null; paidTo: PartyRef | null }
    ruleRequested: { paidFrom: PartyRef | null; paidTo: PartyRef | null }
    afterMerge: { paidFrom: PartyRef | null; paidTo: PartyRef | null }
  }
}

export interface DuplicateImportRowErrorContext {
  type: 'duplicate_import_row'
  row: {
    id: number
    lineNo: number
    operationDate: string | null
    descriptionRaw: string | null
    amountMinor: number | null
    amountRaw: string | null
    counterpartyAccountRaw: string | null
    parseStatus: string
    direction: string
  }
  existingTransaction: {
    id: number
    transDate: string | null
    transTitle: string | null
    transDescription: string | null
    amountMinor: number
    direction: string
    importId: number | null
  }
}

export type ImportErrorContext = ClassificationRuleErrorContext | DuplicateImportRowErrorContext

export function isDuplicateImportRowContext(
  ctx: ImportErrorContext,
): ctx is DuplicateImportRowErrorContext {
  return ctx.type === 'duplicate_import_row'
}

export function isClassificationRuleErrorContext(
  ctx: ImportErrorContext,
): ctx is ClassificationRuleErrorContext {
  return ctx.type === 'classification_rule' || 'rule' in ctx
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  return parseApiError(err, fallback).message
}

export function parseApiError(
  err: unknown,
  fallback: string,
): { message: string; context?: ImportErrorContext } {
  const data = (err as { response?: { data?: ApiErrorBody } })?.response?.data
  return {
    message: data?.message ?? data?.detail ?? fallback,
    context: data?.context,
  }
}

function formatPartyRef(party: PartyRef | null | undefined): string {
  if (!party) return '(brak)'
  if (!party.name) return `id=${party.id}`
  return `${party.name} (id=${party.id})`
}

export function formatClassificationRuleErrorContext(ctx: ClassificationRuleErrorContext): string {
  const lines = [
    `Przyczyna: ${ctx.cause}`,
    '',
    `Reguła #${ctx.rule.id ?? '—'}: ${ctx.rule.name} (priorytet ${ctx.rule.priority})`,
    `Podmiot reguły: ${formatPartyRef(ctx.rule.partyId != null ? { id: ctx.rule.partyId, name: ctx.rule.partyName } : null)}`,
    '',
    'Przypisanie Skąd / Dokąd:',
    `  przed regułą:     Skąd ${formatPartyRef(ctx.assignment.before.paidFrom)}, Dokąd ${formatPartyRef(ctx.assignment.before.paidTo)}`,
    `  żądane w regule:  Skąd ${formatPartyRef(ctx.assignment.ruleRequested.paidFrom)}, Dokąd ${formatPartyRef(ctx.assignment.ruleRequested.paidTo)}`,
    `  po scaleniu:      Skąd ${formatPartyRef(ctx.assignment.afterMerge.paidFrom)}, Dokąd ${formatPartyRef(ctx.assignment.afterMerge.paidTo)}`,
    '',
    'Warunki reguły:',
    JSON.stringify(ctx.rule.conditions, null, 2),
    '',
    'Akcje reguły:',
    JSON.stringify(ctx.rule.actions, null, 2),
  ]
  return lines.join('\n')
}
