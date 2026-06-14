export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      {children}
    </p>
  )
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

export const readOnlyFieldCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'

export const splitInputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono ' +
  'focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40'

export function ReadOnlyField({ value, hint }: { value: string; hint?: string }) {
  return (
    <div className={readOnlyFieldCls}>
      {value}
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </div>
  )
}
