import type { DuplicateImportRowErrorContext } from '@/shared/utils/errors'

export interface ImportDuplicateRowErrorDetailsProps {
  context: DuplicateImportRowErrorContext
  className?: string
}

export default function ImportDuplicateRowErrorDetails({
  context,
  className,
}: ImportDuplicateRowErrorDetailsProps) {
  const row = context.row
  const tx = context.existingTransaction

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
      <p className="font-semibold text-red-700 dark:text-red-300">Duplikat wiersza importu</p>

      <div>
        <p className="text-red-600/90 dark:text-red-300/90 font-medium">Wiersz CSV</p>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-red-600/80 dark:text-red-400/80">Linia</dt>
          <dd>{row.lineNo} (id wiersza {row.id})</dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Data</dt>
          <dd>{row.operationDate ?? '—'}</dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Kwota</dt>
          <dd>{formatAmount(row.amountMinor ?? 0)}</dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Opis</dt>
          <dd>„{row.descriptionRaw ?? '—'}”</dd>
          {row.counterpartyAccountRaw && (
            <>
              <dt className="text-red-600/80 dark:text-red-400/80">Kontrahent</dt>
              <dd className="font-mono">{row.counterpartyAccountRaw}</dd>
            </>
          )}
          <dt className="text-red-600/80 dark:text-red-400/80">Status wiersza</dt>
          <dd>{row.parseStatus}</dd>
        </dl>
      </div>

      <div>
        <p className="text-red-600/90 dark:text-red-300/90 font-medium">Istniejąca transakcja</p>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-red-600/80 dark:text-red-400/80">Id</dt>
          <dd>
            #{tx.id}
            {tx.importId != null ? ` (import #${tx.importId})` : ''}
          </dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Data</dt>
          <dd>{tx.operationDate ?? '—'}</dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Kwota</dt>
          <dd>{formatAmount(tx.amountMinor ?? 0)}</dd>
          <dt className="text-red-600/80 dark:text-red-400/80">Opis</dt>
          <dd>„{tx.description ?? '—'}”</dd>
        </dl>
      </div>
    </div>
  )
}

function formatAmount(amountMinor: number): string {
  const sign = amountMinor < 0 ? '−' : ''
  const abs = Math.abs(amountMinor)
  const zl = Math.floor(abs / 100)
  const gr = abs % 100
  return `${sign}${zl},${String(gr).padStart(2, '0')} zł`
}
