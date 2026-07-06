import { ArrowRightToLine } from 'lucide-react'
import type { PersonKey } from '@/shared/api/settlements'
import { PERSON_THEMES, SETTLEMENT_UI_LABELS } from '@/domains/home/reports/settlements/constants'

export default function RotationAnchorBadge({
  person,
  animated = true,
  size = 'md',
}: {
  person: PersonKey
  animated?: boolean
  size?: 'sm' | 'md'
}) {
  const theme = PERSON_THEMES[person]
  const iconSize = size === 'sm' ? 12 : 14
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs font-medium' : 'px-2 py-0.5 text-xs font-semibold'

  return (
    <span
      className={['inline-flex items-center gap-1 rounded-full', padding, theme.badge].join(' ')}
      title={SETTLEMENT_UI_LABELS.rotationAnchorHint}
    >
      {animated ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={[
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
              theme.badgeDot,
            ].join(' ')}
          />
          <span
            className={['relative inline-flex h-1.5 w-1.5 rounded-full', theme.badgeDot].join(' ')}
          />
        </span>
      ) : (
        <ArrowRightToLine size={iconSize} aria-hidden />
      )}
      {SETTLEMENT_UI_LABELS.rotationAnchorBadge}
    </span>
  )
}
