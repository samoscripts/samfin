export interface AvatarSprite {
  id: string
  label: string
  file: string
  columns: number
  rows: number
  total: number
}

export const AVATAR_SPRITES: AvatarSprite[] = [
  {
    id: 'funny-avatars-01',
    label: 'Dowcipne awatary',
    file: '/app/avatars/funny-avatars-01.png',
    columns: 5,
    rows: 5,
    total: 25,
  },
  {
    id: 'funny-avatars-02',
    label: 'Dowcipne awatary 2',
    file: '/app/avatars/funny-avatars-02.png',
    columns: 5,
    rows: 5,
    total: 25,
  },
]

export function getSpriteById(id: string | null | undefined): AvatarSprite | null {
  if (!id) return null
  return AVATAR_SPRITES.find((s) => s.id === id) ?? null
}

export function spriteStyle(
  sprite: AvatarSprite,
  index: number,
  size: number,
): React.CSSProperties {
  const col = index % sprite.columns
  const row = Math.floor(index / sprite.columns)
  const x = sprite.columns > 1 ? (col / (sprite.columns - 1)) * 100 : 0
  const y = sprite.rows > 1 ? (row / (sprite.rows - 1)) * 100 : 0

  return {
    backgroundImage: `url(${sprite.file})`,
    backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: 'no-repeat',
    width: size,
    height: size,
  }
}
