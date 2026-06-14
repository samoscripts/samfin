import { useEffect, useState } from 'react'
import { fetchAppInfo, type AppInfo } from '@/shared/api/appInfo'

export function useAppInfo() {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchAppInfo()
      .then((data) => {
        if (!cancelled) setInfo(data)
      })
      .catch(() => {
        if (!cancelled) setInfo(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return info
}
