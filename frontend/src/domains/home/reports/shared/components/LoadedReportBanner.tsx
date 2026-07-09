import { btnSecondary, inputCls } from '@/shared/components/form/formClasses'

interface LoadedReportBannerProps {
  name: string
  description: string | null
  onRename: () => void
  label?: string
}

export default function LoadedReportBanner({
  name,
  description,
  onRename,
  label = 'Zaczytany raport',
}: LoadedReportBannerProps) {
  return (
    <div className="rounded-lg border border-[#c9a96e]/40 bg-[#c9a96e]/5 px-3 py-3 space-y-2">
      <p className="text-xs font-semibold text-[#c9a96e] uppercase tracking-wide">
        {label}
      </p>
      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={name}
          readOnly
          className={[inputCls, 'flex-1 bg-white/60 dark:bg-gray-900/60'].join(' ')}
        />
        <button type="button" onClick={onRename} className={[btnSecondary, 'shrink-0 px-3 py-2 text-xs'].join(' ')}>
          Zmień
        </button>
      </div>
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{description}</p>
      )}
    </div>
  )
}
