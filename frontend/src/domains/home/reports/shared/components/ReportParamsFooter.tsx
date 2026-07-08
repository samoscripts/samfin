interface ReportParamsFooterProps {
  onApply: () => void
  onCreate: () => void
  onUpdate: () => void
  updateDisabled: boolean
}

export default function ReportParamsFooter({
  onApply,
  onCreate,
  onUpdate,
  updateDisabled,
}: ReportParamsFooterProps) {
  return (
    <div className="shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
      <button
        type="button"
        onClick={onApply}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-[#163526] text-white hover:bg-[#1e4a32] transition-colors"
      >
        Zastosuj
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Utwórz raport
        </button>
        <button
          type="button"
          onClick={onUpdate}
          disabled={updateDisabled}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-default"
        >
          Aktualizuj
        </button>
      </div>
    </div>
  )
}
