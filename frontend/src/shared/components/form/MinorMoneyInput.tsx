import { useEffect, useRef, useState } from 'react'
import {
  formatMoneyInput,
  minorToMoneyInput,
  parseMoneyInput,
  parseMoneyInputToMinor,
} from '@/shared/utils/moneyInput'

export interface MinorMoneyInputProps {
  value: unknown
  onChange: (value: number | string) => void
  inputClassName?: string
  placeholder?: string
  disabled?: boolean
}

function valueToDisplay(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return minorToMoneyInput(value)
  return String(value)
}

export default function MinorMoneyInput({
  value,
  onChange,
  inputClassName = '',
  placeholder,
  disabled = false,
}: MinorMoneyInputProps) {
  const [text, setText] = useState(() => valueToDisplay(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setText(valueToDisplay(value))
    }
  }, [value])

  function commitRaw(raw: string) {
    const stripped = raw.trim()
    if (stripped === '') {
      onChange('')
      return
    }

    const minor = parseMoneyInputToMinor(stripped)
    if (minor !== null) {
      onChange(minor)
      return
    }

    onChange(stripped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    commitRaw(raw)
  }

  function handleFocus() {
    focusedRef.current = true
  }

  function handleBlur() {
    focusedRef.current = false
    const stripped = text.trim()
    if (stripped === '') {
      setText('')
      onChange('')
      return
    }

    const magnitude = parseMoneyInput(stripped)
    if (magnitude !== null) {
      const formatted = formatMoneyInput(magnitude)
      setText(formatted)
      onChange(parseMoneyInputToMinor(formatted)!)
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={inputClassName}
    />
  )
}
