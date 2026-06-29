import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { App } from '@capacitor/app'
import type { MobileRelease } from '@/shared/api/mobileRelease'
import { checkMobileUpdate, type UpdateStatus } from '@/mobile/updateCheck'
import { isNativeApp } from '@/mobile/platform'

interface MobileUpdateContextValue {
  status: UpdateStatus
  release: MobileRelease | null
  localVersionCode: number
  localVersionName: string
  isChecking: boolean
  recheck: () => Promise<void>
}

const MobileUpdateContext = createContext<MobileUpdateContextValue>({
  status: 'idle',
  release: null,
  localVersionCode: 0,
  localVersionName: '',
  isChecking: false,
  recheck: async () => {},
})

export function useMobileUpdate(): MobileUpdateContextValue {
  return useContext(MobileUpdateContext)
}

export function MobileUpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus>(isNativeApp() ? 'checking' : 'idle')
  const [release, setRelease] = useState<MobileRelease | null>(null)
  const [localVersionCode, setLocalVersionCode] = useState(0)
  const [localVersionName, setLocalVersionName] = useState('')
  const [isChecking, setIsChecking] = useState(isNativeApp())

  const recheck = useCallback(async () => {
    if (!isNativeApp()) {
      setStatus('idle')
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    const result = await checkMobileUpdate()
    setStatus(result.status)
    setRelease(result.release)
    setLocalVersionCode(result.localVersionCode)
    setLocalVersionName(result.localVersionName)
    setIsChecking(false)
  }, [])

  useEffect(() => {
    void recheck()
  }, [recheck])

  useEffect(() => {
    if (!isNativeApp()) {
      return
    }

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void recheck()
      }
    })

    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [recheck])

  return (
    <MobileUpdateContext.Provider
      value={{ status, release, localVersionCode, localVersionName, isChecking, recheck }}
    >
      {children}
    </MobileUpdateContext.Provider>
  )
}
