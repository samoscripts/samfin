import { Status } from '@/shared/types'

const CONFIG: Record<Status, { label: string; className: string }> = {
  CLASSIFIED: {
    label: 'Sklasyfikowany',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  PARTIALLY_CLASSIFIED: {
    label: 'Częściowo',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  UNCLASSIFIED: {
    label: 'Nieklasyfikowany',
    className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = CONFIG[status] ?? CONFIG.UNCLASSIFIED
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
