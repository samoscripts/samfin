import { useEffect, useRef, useState } from 'react'
import type { Direction } from '@/shared/types'
import {
  formatMoneyInput,
  parseMoneyInput,
  parseSignedMoneyInput,
  toDisplayMagnitude,
} from '@/shared/utils/moneyInput'
import { roundMoney } from '@/shared/utils/splitAllocation'

export interface MoneyAmountInputProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  direction: Direction
  /** EXPENSE split: show − prefix; value is signed. When false, value is positive magnitude only. */
  showSignPrefix?: boolean
  className?: string
  inputClassName?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

export default function MoneyAmountInput({
  value,
  onChange,
  direction,
  showSignPrefix = false,
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  id,
}: MoneyAmountInputProps) {
  const magnitudeOnly = !showSignPrefix
  const [text, setText] = useState(() =>
    value != null && Number.isFinite(value) ? toDisplayMagnitude(value, magnitudeOnly) : '',
  )
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setText(
        value != null && Number.isFinite(value) ? toDisplayMagnitude(value, magnitudeOnly) : '',
      )
    }
  }, [value, magnitudeOnly])

  function commitRaw(raw: string) {
    const stripped = raw.replace(/-/g, '').trim()
    if (stripped === '') {
      onChange(null)
      return
    }

    if (magnitudeOnly) {
      const magnitude = parseMoneyInput(stripped)
      if (magnitude === null) return
      onChange(roundMoney(magnitude))
      return
    }

    const signed = parseSignedMoneyInput(stripped, direction)
    if (signed === null) return
    onChange(signed)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/-/g, '')
    setText(raw)
    commitRaw(raw)
  }

  function handleFocus() {
    focusedRef.current = true
  }

  function handleBlur() {
    focusedRef.current = false
    const stripped = text.replace(/-/g, '').trim()
    if (stripped === '') {
      setText('')
      return
    }
    const magnitude = parseMoneyInput(stripped)
    if (magnitude !== null) {
      setText(formatMoneyInput(magnitude))
    }
  }

  const showPrefix = showSignPrefix && direction === 'EXPENSE'

  return (
    <div className={`flex items-stretch min-w-0 ${className}`}>
      {showPrefix && (
        <span
          className={[
            inputClassName,
            'shrink-0 !w-auto flex items-center justify-center px-2 !rounded-r-none border-r-0',
            'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 select-none',
          ].join(' ')}
          aria-hidden
        >
          −
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        className={[
          inputClassName,
          'flex-1 min-w-0',
          showPrefix ? '!rounded-l-none' : '',
        ].join(' ')}
      />
    </div>
  )
}
