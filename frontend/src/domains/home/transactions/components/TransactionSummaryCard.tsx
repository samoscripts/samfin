import type { Transaction } from '@/shared/types'

import Pill from '@/shared/components/Pill'

import ExpandableText from '@/shared/components/ExpandableText'

import { DIRECTION_PILL, STATUS_PILL } from '@/shared/constants/pillMaps'

import { DIRECTION_LABEL_BY_VALUE, STATUS_LABEL_BY_VALUE } from '../constants/labels'

import { formatAmount } from '@/shared/utils/format'

import {

  transactionDisplayLabel,

  transactionPrimaryLabel,

  transactionSubtitleLines,

} from '../utils/transactionDisplay'



export interface TransactionSummaryCardProps {

  tx: Transaction

  className?: string

  /** stacked — pionowo (sidebar); grid — Status / Strony / Klasyfikacja w jednym rzędzie od md w górę */

  layout?: 'stacked' | 'grid'

}



export default function TransactionSummaryCard({

  tx,

  className,

  layout = 'stacked',

}: TransactionSummaryCardProps) {

  const items =

    tx.items.length > 0

      ? tx.items

      : [{ amount: tx.amount, wallet: null, concern: null, category: null, description: null }]



  const subtitles = transactionSubtitleLines(tx)



  const statusBlock = (

    <DetailSection label="Status">

      <Pill variant={STATUS_PILL[tx.status]}>{STATUS_LABEL_BY_VALUE[tx.status]}</Pill>

    </DetailSection>

  )



  const partiesBlock = (

    <DetailSection label="Strony transakcji">

      <div className="space-y-2">

        <DetailRow label="Skąd" value={tx.paidFrom} />

        <DetailRow label="Dokąd" value={tx.paidTo} />

        {tx.transTitle && (

          <DetailRow label="Tytuł transakcji" value={tx.transTitle} />

        )}

        {tx.transDescription && tx.transDescription !== tx.transTitle && (

          <DetailRow label="Opis transakcji" value={tx.transDescription} />

        )}

        {tx.transCustomDescription && (

          <DetailRow label="Własny opis" value={tx.transCustomDescription} />

        )}

        {tx.counterpartyName && (

          <DetailRow label="Kontrahent" value={tx.counterpartyName} />

        )}

        {tx.counterpartyAccountNumber && (

          <DetailRow label="NRB kontrahenta" value={tx.counterpartyAccountNumber} mono />

        )}

        {tx.balanceAfterMinor != null && (

          <DetailRow

            label="Saldo po operacji"

            value={formatAmount(tx.balanceAfterMinor / 100)}

            mono

          />

        )}

      </div>

    </DetailSection>

  )



  const classificationBlock = (

    <div className="space-y-3">

      {items.map((item, i) => (

        <div key={i} className="space-y-2">

          {items.length > 1 ? (

            <div className="flex items-center justify-between gap-2">

              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">

                Pozycja {i + 1}

              </p>

              <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">

                {formatAmount(item.amount)}

              </span>

            </div>

          ) : (

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">

              Klasyfikacja

            </p>

          )}

          <DetailRow label="Portfel" value={item.wallet} />

          <DetailRow label="Dotyczy" value={item.concern} />

          <DetailRow label="Kategoria" value={item.category} />

        </div>

      ))}

    </div>

  )



  return (

    <div

      className={[

        'rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',

        className,

      ]

        .filter(Boolean)

        .join(' ')}

    >

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">

        <div className="flex items-center justify-between mb-1 gap-2">

          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{tx.transDate}</span>

          <Pill variant={DIRECTION_PILL[tx.direction]}>

            {DIRECTION_LABEL_BY_VALUE[tx.direction]}

          </Pill>

        </div>

        <ExpandableText

          text={transactionPrimaryLabel(tx) ?? transactionDisplayLabel(tx)}

          className="mb-1"

          textClassName="text-sm font-medium text-gray-900 dark:text-gray-100"

          lines={2}

        />

        {subtitles.map((line) => (

          <p key={line} className="text-xs text-gray-500 dark:text-gray-400 mb-1">

            {line}

          </p>

        ))}

        <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatAmount(tx.amount)}</p>

      </div>



      <div className="px-4 py-3 bg-white dark:bg-gray-900">

        {layout === 'grid' ? (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

            <div className="min-w-0">{statusBlock}</div>

            <div className="min-w-0 md:border-l md:border-gray-100 md:dark:border-gray-800 md:pl-6">

              {partiesBlock}

            </div>

            <div className="min-w-0 md:border-l md:border-gray-100 md:dark:border-gray-800 md:pl-6">

              {classificationBlock}

            </div>

          </div>

        ) : (

          <div className="space-y-4">

            {statusBlock}

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {partiesBlock}

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {classificationBlock}

          </div>

        )}

      </div>

    </div>

  )

}



function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {

  return (

    <div className="space-y-2">

      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>

      {children}

    </div>

  )

}



function DetailRow({

  label,

  value,

  mono,

}: {

  label: string

  value?: string | null

  mono?: boolean

}) {

  return (

    <div className="flex items-start justify-between gap-4">

      <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">{label}</span>

      <span

        className={[

          'text-sm text-gray-900 dark:text-gray-100 text-right',

          mono ? 'font-mono text-xs break-all' : '',

        ].join(' ')}

      >

        {value ?? '—'}

      </span>

    </div>

  )

}


