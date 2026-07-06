interface ReportStatCardProps {
  label: string
  value: string
  sub?: string
  valueColor?: string
}

export default function ReportStatCard({ label, value, sub, valueColor }: ReportStatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p
        className={[
          'text-2xl font-semibold mt-1 tabular-nums',
          valueColor ?? 'text-gray-900 dark:text-gray-100',
        ].join(' ')}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
