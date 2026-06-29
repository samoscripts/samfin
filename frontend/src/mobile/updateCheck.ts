import { App } from '@capacitor/app'
import { fetchMobileRelease, type MobileRelease } from '@/shared/api/mobileRelease'
import { isNativeApp } from './platform'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'ok'
  | 'optional'
  | 'required'
  | 'unavailable'

export interface UpdateCheckResult {
  status: UpdateStatus
  localVersionCode: number
  localVersionName: string
  release: MobileRelease | null
}

export async function checkMobileUpdate(): Promise<UpdateCheckResult> {
  if (!isNativeApp()) {
    return { status: 'idle', localVersionCode: 0, localVersionName: '', release: null }
  }

  const info = await App.getInfo()
  const localVersionCode = Number.parseInt(info.build, 10) || 0
  const localVersionName = info.version

  const release = await fetchMobileRelease()
  if (!release) {
    return { status: 'unavailable', localVersionCode, localVersionName, release: null }
  }

  const minVersion = release.minVersionCode ?? 0
  if (minVersion > 0 && localVersionCode < minVersion) {
    return { status: 'required', localVersionCode, localVersionName, release }
  }

  if (localVersionCode < release.versionCode) {
    return { status: 'optional', localVersionCode, localVersionName, release }
  }

  return { status: 'ok', localVersionCode, localVersionName, release }
}

export function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /Android/i.test(navigator.userAgent)
}

const INSTALL_BANNER_KEY = 'samfin_install_banner_dismissed'
const INSTALL_BANNER_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function isInstallBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem(INSTALL_BANNER_KEY)
    if (!raw) {
      return false
    }
    const dismissedAt = Number.parseInt(raw, 10)
    if (Number.isNaN(dismissedAt)) {
      return false
    }
    return Date.now() - dismissedAt < INSTALL_BANNER_TTL_MS
  } catch {
    return false
  }
}

export function dismissInstallBanner(): void {
  try {
    localStorage.setItem(INSTALL_BANNER_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}
