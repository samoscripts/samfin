import Select from './Select'

export interface DictionaryItem {
  id: number
  name: string
  active?: boolean
}

export type DictionaryValueType = 'string' | 'number'

export interface DictionarySelectProps<T extends DictionaryItem> {
  items: T[]
  value: string | number | null | undefined
  onChange: (value: string | number | null) => void
  emptyLabel: string
  valueType: DictionaryValueType
  filterItem?: (item: T) => boolean
  getLabel?: (item: T) => string
  className?: string
  disabled?: boolean
}

export default function DictionarySelect<T extends DictionaryItem>({
  items,
  value,
  onChange,
  emptyLabel,
  valueType,
  filterItem,
  getLabel = (item) => item.name,
  className,
  disabled,
}: DictionarySelectProps<T>) {
  const visible = filterItem ? items.filter(filterItem) : items
  const displayValue = value === null || value === undefined ? '' : String(value)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value
    if (raw === '') {
      onChange(null)
      return
    }
    onChange(valueType === 'number' ? Number(raw) : raw)
  }

  return (
    <Select
      value={displayValue}
      onChange={handleChange}
      className={className}
      disabled={disabled}
    >
      <option value="">{emptyLabel}</option>
      {visible.map((item) => (
        <option key={item.id} value={valueType === 'number' ? item.id : String(item.id)}>
          {getLabel(item)}
        </option>
      ))}
    </Select>
  )
}
