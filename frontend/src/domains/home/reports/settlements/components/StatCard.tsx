import { ArrowRightToLine } from 'lucide-react'
import type { PersonKey } from '@/shared/api/settlements'
import { PERSON_THEMES, SETTLEMENT_UI_LABELS, personSectionClasses } from '@/domains/home/reports/settlements/constants'
import RotationAnchorBadge from '@/domains/home/reports/settlements/components/RotationAnchorBadge'

export default function StatCard({
  person,
  label,
  value,
  sub,
  icon,
  queueActive,
}: {
  person: PersonKey
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  queueActive?: boolean
}) {
  const theme = PERSON_THEMES[person]

  return (
    <div
      className={[
        'relative border rounded-xl p-5 transition-shadow h-full',
        personSectionClasses(person, { variant: 'card' }),
        queueActive ? theme.anchorGlow : '',
      ].join(' ')}
    >
      {queueActive && (
        <div
          className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-md ring-1 ring-black/5 dark:ring-white/10"
          title={SETTLEMENT_UI_LABELS.rotationAnchorHint}
        >
          <ArrowRightToLine size={14} className={theme.icon} aria-hidden />
        </div>
      )}
      <div className="flex h-full items-start gap-3">
        {icon && <div className={['shrink-0 mt-0.5', theme.icon].join(' ')}>{icon}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={['text-sm font-medium', theme.label].join(' ')}>{label}</p>
            {queueActive && <RotationAnchorBadge person={person} />}
          </div>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
