import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useMobileUpdate } from '@/app/providers/MobileUpdateProvider'
import { isNativeApp } from '@/mobile/platform'

export default function MobileUpdateBanner() {
  const { status, release } = useMobileUpdate()
  const [dismissed, setDismissed] = useState(false)

  if (!isNativeApp() || status !== 'optional' || !release || dismissed) {
    return null
  }

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#1a472a]/10 border-b border-[#1a472a]/20 text-sm text-gray-800 dark:text-gray-200">
      <Download size={16} className="shrink-0 text-[#1a472a] dark:text-[#c9a96e]" />
      <p className="flex-1 min-w-0">
        Dostępna wersja <span className="font-medium">{release.versionName}</span> aplikacji
        mobilnej.
      </p>
      <a
        href={release.latestApkUrl}
        className="shrink-0 rounded-md bg-[#1a472a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163526] transition-colors"
      >
        Pobierz
      </a>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-label="Zamknij"
      >
        <X size={16} />
      </button>
    </div>
  )
}
