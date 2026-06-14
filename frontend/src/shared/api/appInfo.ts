import api from './client'

export interface AppInfo {
  status: string
  app: string
  version: string
  environment: string
  debug: boolean
  build: string | null
  commit: string | null
  profilerUrl: string | null
}

export async function fetchAppInfo(): Promise<AppInfo> {
  const res = await api.get<AppInfo>('/health')
  return res.data
}
