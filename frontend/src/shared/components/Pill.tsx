import {
  PILL_BASE,
  PILL_SIZE_CLASS,
  PILL_VARIANT_CLASS,
  type PillSize,
  type PillVariant,
} from './pillVariants'

export interface PillProps {
  variant?: PillVariant
  size?: PillSize
  uppercase?: boolean
  className?: string
  children: React.ReactNode
}

export default function Pill({
  variant = 'neutral',
  size = 'md',
  uppercase = false,
  className = '',
  children,
}: PillProps) {
  return (
    <span
      className={[
        PILL_BASE,
        PILL_SIZE_CLASS[size],
        PILL_VARIANT_CLASS[variant],
        uppercase ? 'uppercase tracking-wide' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
