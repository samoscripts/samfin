import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { App } from '@capacitor/app'
import { hasPin } from '@/mobile/pinAuth'
import {
  clearStoredToken,
  hasStoredToken,
  loadTokenToMemory,
  migrateLegacyTokenIfNeeded,
  setMemoryToken,
} from '@/mobile/tokenStorage'
import { isNativeApp } from '@/mobile/platform'

export type AppLockPhase = 'inactive' | 'setup' | 'locked' | 'unlocked'

interface AppLockContextValue {
  phase: AppLockPhase
  isInitializing: boolean
  pinChecked: boolean
  completeSetup: () => void
  unlock: () => Promise<boolean>
  lockNow: () => void
}

const AppLockContext = createContext<AppLockContextValue>({
  phase: 'inactive',
  isInitializing: true,
  pinChecked: false,
  completeSetup: () => {},
  unlock: async () => false,
  lockNow: () => {},
})

export function useAppLock(): AppLockContextValue {
  return useContext(AppLockContext)
}

interface AppLockProviderProps {
  children: ReactNode
  isAuthenticated: boolean
  onUnlock: () => Promise<void>
}

export function AppLockProvider({ children, isAuthenticated, onUnlock }: AppLockProviderProps) {
  const [phase, setPhase] = useState<AppLockPhase>('inactive')
  const [isInitializing, setIsInitializing] = useState(isNativeApp())
  const [pinChecked, setPinChecked] = useState(!isNativeApp())
  const unlockedOnce = useRef(false)

  const lockNow = useCallback(() => {
    if (!isNativeApp()) {
      return
    }
    setMemoryToken(null)
    setPhase('locked')
  }, [])

  const unlock = useCallback(async (): Promise<boolean> => {
    const token = await loadTokenToMemory()
    if (!token) {
      return false
    }

    try {
      await onUnlock()
      unlockedOnce.current = true
      setPhase('unlocked')
      return true
    } catch {
      setMemoryToken(null)
      await clearStoredToken()
      return false
    }
  }, [onUnlock])

  const completeSetup = useCallback(() => {
    unlockedOnce.current = true
    setPhase('unlocked')
    setPinChecked(true)
  }, [])

  useEffect(() => {
    if (!isNativeApp()) {
      setIsInitializing(false)
      setPinChecked(true)
      return
    }

    void (async () => {
      await migrateLegacyTokenIfNeeded()

      const pinSet = await hasPin()
      const tokenStored = await hasStoredToken()

      if (pinSet && tokenStored) {
        setMemoryToken(null)
        setPhase('locked')
      }

      setIsInitializing(false)
    })()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      unlockedOnce.current = false
      if (isNativeApp()) {
        setPinChecked(false)
      }
      return
    }

    if (!isNativeApp()) {
      return
    }

    void hasPin().then((pinSet) => {
      if (!pinSet) {
        setPhase('setup')
      } else {
        setPhase('unlocked')
        unlockedOnce.current = true
      }
      setPinChecked(true)
    })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isNativeApp()) {
      return
    }

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && unlockedOnce.current) {
        void hasPin().then((pinSet) => {
          if (pinSet) {
            lockNow()
          }
        })
      }
    })

    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [lockNow])

  return (
    <AppLockContext.Provider
      value={{ phase, isInitializing, pinChecked, completeSetup, unlock, lockNow }}
    >
      {children}
    </AppLockContext.Provider>
  )
}
