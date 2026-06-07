import { getSpriteById, spriteStyle } from '@/domains/settings/avatars'

interface AvatarDisplayProps {
  sprite: string | null | undefined
  index: number | null | undefined
  displayName?: string
  size?: number
  fill?: boolean
  className?: string
}

/** Fallback colors for avatar circles (by displayName initial) */
const COLORS = [
  '#163526', '#1c4230', '#2d5a40', '#3d7a58',
  '#4a6741', '#6b4c2a', '#8a5c35', '#7a3d3d',
]

function colorFromName(name: string | undefined): string {
  if (!name) return COLORS[0]
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return COLORS[code % COLORS.length]
}

export default function AvatarDisplay({
  sprite,
  index,
  displayName,
  size = 40,
  fill = false,
  className,
}: AvatarDisplayProps) {
  const spriteConfig = getSpriteById(sprite)

  if (spriteConfig && index !== null && index !== undefined) {
    const style = spriteStyle(spriteConfig, index, size)
    return (
      <div
        className={['rounded-full overflow-hidden shrink-0', className ?? ''].join(' ')}
        style={fill ? { ...style, width: '100%', height: '100%' } : style}
        title={displayName}
        aria-label={displayName}
      />
    )
  }

  // Fallback: colored circle with initials
  const initials = displayName
    ? displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return (
    <div
      className={[
        'rounded-full shrink-0 flex items-center justify-center text-white font-semibold select-none',
        className ?? '',
      ].join(' ')}
      style={{
        width: fill ? '100%' : size,
        height: fill ? '100%' : size,
        backgroundColor: colorFromName(displayName),
        fontSize: Math.round(size * 0.38),
      }}
      title={displayName}
      aria-label={displayName}
    >
      {initials}
    </div>
  )
}
