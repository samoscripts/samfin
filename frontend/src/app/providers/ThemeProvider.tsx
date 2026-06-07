import { createContext, useContext, useEffect, useState } from 'react'
import { ThemeMode } from '@/shared/types'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  effective: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  effective: 'light',
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(effective: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('samfin-theme')
    return (stored as ThemeMode) ?? 'system'
  })

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)

  const effective: 'light' | 'dark' = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    applyTheme(effective)
  }, [effective])

  const setMode = (next: ThemeMode) => {
    localStorage.setItem('samfin-theme', next)
    setModeState(next)
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, effective }}>
      {children}
    </ThemeContext.Provider>
  )
}
