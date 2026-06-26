import type { Transaction } from '@/shared/types'
import ListTextTooltip from '@/shared/components/ListTextTooltip'
import { transactionPrimaryLabel, transactionSubtitleLines } from '../utils/transactionDisplay'

export interface TransactionOperationTextProps {
  tx: Transaction
  lines?: 1 | 2
}

export default function TransactionOperationText({ tx, lines }: TransactionOperationTextProps) {
  const primary = transactionPrimaryLabel(tx)
  const subtitles = transactionSubtitleLines(tx)

  return (
    <>
      <ListTextTooltip text={primary} lines={lines} />
      {subtitles.map((line) => (
        <p key={line} className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {line}
        </p>
      ))}
    </>
  )
}
