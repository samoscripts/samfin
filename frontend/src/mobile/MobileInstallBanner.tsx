import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, X } from 'lucide-react'
import { fetchMobileRelease } from '@/shared/api/mobileRelease'
import {
  dismissInstallBanner,
  isAndroidBrowser,
  isInstallBannerDismissed,
} from '@/mobile/updateCheck'
import { isNativeApp } from '@/mobile/platform'

export default function MobileInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [hasRelease, setHasRelease] = useState(false)

  useEffect(() => {
    if (isNativeApp() || !isAndroidBrowser() || isInstallBannerDismissed()) {
      return
    }

    void fetchMobileRelease().then((release) => {
      if (release) {
        setHasRelease(true)
        setVisible(true)
      }
    })
  }, [])

  if (!visible || !hasRelease) {
    return null
  }

  const handleDismiss = () => {
    dismissInstallBanner()
    setVisible(false)
  }

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 text-sm text-amber-950 dark:text-amber-100">
      <Smartphone size={16} className="shrink-0" />
      <p className="flex-1 min-w-0">
        Korzystaj z SamFin wygodniej — zainstaluj aplikację na Androidzie.
      </p>
      <Link
        to="/o-aplikacji#mobilna"
        className="shrink-0 rounded-md bg-[#1a472a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163526] transition-colors"
      >
        Więcej
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Zamknij"
      >
        <X size={16} />
      </button>
    </div>
  )
}
