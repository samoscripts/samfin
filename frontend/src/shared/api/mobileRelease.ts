export interface MobileRelease {
  versionName: string
  versionCode: number
  minVersionCode: number | null
  apkUrl: string
  latestApkUrl: string
  publishedAt: string
}

export async function fetchMobileRelease(): Promise<MobileRelease | null> {
  try {
    const res = await fetch('/downloads/mobile.json', { cache: 'no-store' })
    if (!res.ok) {
      return null
    }
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object') {
      return null
    }
    const release = data as Partial<MobileRelease>
    if (
      typeof release.versionName !== 'string' ||
      typeof release.versionCode !== 'number' ||
      typeof release.latestApkUrl !== 'string'
    ) {
      return null
    }
    return {
      versionName: release.versionName,
      versionCode: release.versionCode,
      minVersionCode:
        typeof release.minVersionCode === 'number' ? release.minVersionCode : null,
      apkUrl: typeof release.apkUrl === 'string' ? release.apkUrl : release.latestApkUrl,
      latestApkUrl: release.latestApkUrl,
      publishedAt: typeof release.publishedAt === 'string' ? release.publishedAt : '',
    }
  } catch {
    return null
  }
}
