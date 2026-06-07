import { useState } from 'react'
import { AVATAR_SPRITES, AvatarSprite, getSpriteById } from '@/domains/settings/avatars'
import AvatarDisplay from './AvatarDisplay'

interface AvatarPickerValue {
  avatarSprite: string | null
  avatarIndex: number | null
}

interface AvatarPickerProps {
  value: AvatarPickerValue
  onChange: (value: AvatarPickerValue) => void
}

/** Returns background CSS for a single sprite cell — no fixed width/height. */
function spriteBg(sprite: AvatarSprite, index: number): React.CSSProperties {
  const col = index % sprite.columns
  const row = Math.floor(index / sprite.columns)
  const x = sprite.columns > 1 ? (col / (sprite.columns - 1)) * 100 : 0
  const y = sprite.rows > 1 ? (row / (sprite.rows - 1)) * 100 : 0
  return {
    backgroundImage: `url(${sprite.file})`,
    backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: 'no-repeat',
  }
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [selectedSpriteId, setSelectedSpriteId] = useState<string>(
    value.avatarSprite ?? AVATAR_SPRITES[0].id,
  )

  const sprite = getSpriteById(selectedSpriteId) ?? AVATAR_SPRITES[0]

  const handleSpriteChange = (id: string) => {
    setSelectedSpriteId(id)
    onChange({ avatarSprite: id, avatarIndex: 0 })
  }

  const handleSelect = (index: number) => {
    onChange({ avatarSprite: selectedSpriteId, avatarIndex: index })
  }

  return (
    <div className="space-y-3">
      {/* Sprite set selector */}
      {AVATAR_SPRITES.length > 1 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Zestaw awatarów</p>
          <select
            value={selectedSpriteId}
            onChange={(e) => handleSpriteChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          >
            {AVATAR_SPRITES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Avatar grid — fills available width, cells are square via aspect-ratio */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Wybierz awatar</p>
        <div
          className="grid gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700"
          style={{ gridTemplateColumns: `repeat(${sprite.columns}, 1fr)` }}
        >
          {Array.from({ length: sprite.total }, (_, i) => {
            const isSelected =
              value.avatarSprite === selectedSpriteId && value.avatarIndex === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                title={`Awatar ${i + 1}`}
                style={{
                  aspectRatio: '1 / 1',
                  ...spriteBg(sprite, i),
                  backgroundColor: '#d1d5db',
                }}
                className={[
                  'w-full rounded-md overflow-hidden transition-all focus:outline-none',
                  isSelected
                    ? 'ring-2 ring-[#c9a96e] ring-offset-1 ring-offset-gray-50 dark:ring-offset-gray-800 opacity-100'
                    : 'opacity-90 hover:opacity-100 hover:scale-105',
                ].join(' ')}
              />
            )
          })}
        </div>
      </div>

      {/* Preview */}
      {value.avatarSprite && value.avatarIndex !== null && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
          <AvatarDisplay sprite={value.avatarSprite} index={value.avatarIndex} size={48} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Wybrany awatar</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getSpriteById(value.avatarSprite)?.label} #{(value.avatarIndex ?? 0) + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
