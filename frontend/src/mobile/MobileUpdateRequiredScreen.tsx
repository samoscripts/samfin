import { Download } from 'lucide-react'
import type { MobileRelease } from '@/shared/api/mobileRelease'

interface MobileUpdateRequiredScreenProps {
  release: MobileRelease
  localVersionCode: number
  localVersionName: string
}

export default function MobileUpdateRequiredScreen({
  release,
  localVersionCode,
  localVersionName,
}: MobileUpdateRequiredScreenProps) {
  const minLabel =
    release.minVersionCode != null ? ` (wymagana min. ${release.minVersionCode})` : ''

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/app/images/samfin_logo_ico.png"
            alt="SamFin"
            className="h-16 w-16 object-contain"
          />
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">Wymagana aktualizacja</h1>
        <p className="text-sm text-gray-400 mb-6">
          Ta wersja aplikacji nie jest już obsługiwana. Pobierz i zainstaluj najnowsze APK, aby
          kontynuować.
        </p>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm text-gray-300 mb-6 space-y-1">
          <p>
            Twoja wersja: <span className="text-white">{localVersionName}</span>{' '}
            <span className="text-gray-500">({localVersionCode})</span>
          </p>
          <p>
            Dostępna: <span className="text-white">{release.versionName}</span>{' '}
            <span className="text-gray-500">({release.versionCode})</span>
            {minLabel}
          </p>
        </div>

        <a
          href={release.latestApkUrl}
          className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-[#1a472a] hover:bg-[#163526] text-white font-medium transition-colors"
        >
          <Download size={18} />
          Pobierz i zainstaluj
        </a>

        <p className="mt-4 text-xs text-gray-500">
          Po pobraniu uruchomi się instalator Androida. Może być wymagana zgoda na instalację z
          nieznanego źródła.
        </p>
      </div>
    </div>
  )
}
