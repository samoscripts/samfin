interface SystemOptionRowProps {
  title: string
  description?: string
  action: React.ReactNode
}

export default function SystemOptionRow({ title, description, action }: SystemOptionRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-8 sm:items-center px-4 py-3.5 border-b border-gray-100 dark:border-gray-800/80 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex sm:justify-end shrink-0">{action}</div>
    </div>
  )
}
