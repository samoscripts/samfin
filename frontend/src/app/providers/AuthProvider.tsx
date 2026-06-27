import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AuthUser } from '@/shared/types/auth'
import { apiLogin, apiLogout, fetchMe } from '@/shared/api/auth'
import {
  clearStoredToken,
  hasStoredToken,
  loadTokenToMemory,
  migrateLegacyTokenIfNeeded,
  persistToken,
} from '@/mobile/tokenStorage'
import { hasPin } from '@/mobile/pinAuth'
import { isNativeApp } from '@/mobile/platform'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setCurrentUser: (user: AuthUser) => void
  restoreSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  setCurrentUser: () => {},
  restoreSession: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const restoreSession = useCallback(async () => {
    const token = await loadTokenToMemory()
    if (!token) {
      setUser(null)
      return
    }

    const me = await fetchMe()
    setUser(me)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await migrateLegacyTokenIfNeeded()

        if (isNativeApp()) {
          const pinSet = await hasPin()
          const tokenStored = await hasStoredToken()

          if (pinSet && tokenStored) {
            setUser(null)
            return
          }

          if (tokenStored) {
            await restoreSession()
          }
          return
        }

        await restoreSession()
      } catch {
        await clearStoredToken()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [restoreSession])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await apiLogin(email, password)
    await persistToken(token)
    setUser(loggedIn)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore — clear client side regardless
    } finally {
      await clearStoredToken()
      setUser(null)
    }
  }, [])

  const setCurrentUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, setCurrentUser, restoreSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}
