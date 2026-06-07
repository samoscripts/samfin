import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AuthUser } from '@/shared/types/auth'
import { apiLogin, apiLogout, fetchMe } from '@/shared/api/auth'

const TOKEN_KEY = 'samfin_token'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setCurrentUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  setCurrentUser: () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: try to restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await apiLogin(email, password)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore — clear client side regardless
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  const setCurrentUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}
