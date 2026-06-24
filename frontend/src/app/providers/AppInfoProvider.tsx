import { createContext, useContext, useEffect, useState } from 'react'
import { fetchAppInfo, type AppInfo } from '@/shared/api/appInfo'
import {
  getEnvironmentShortLabel,
  isProductionEnvironment,
} from '@/shared/utils/environmentDisplay'

const BASE_TITLE = 'SamFin'

const AppInfoContext = createContext<AppInfo | null>(null)

export function AppInfoProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    if (info && !isProductionEnvironment(info.environment)) {
      document.title = `[${getEnvironmentShortLabel(info.environment)}] ${BASE_TITLE}`
      return
    }

    document.title = BASE_TITLE
  }, [info])

  return <AppInfoContext.Provider value={info}>{children}</AppInfoContext.Provider>
}

export function useAppInfo(): AppInfo | null {
  return useContext(AppInfoContext)
}
