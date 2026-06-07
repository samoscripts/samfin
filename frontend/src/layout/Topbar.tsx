import { useState, useRef, useEffect } from 'react'
import { Bell, Monitor, Sun, Moon, Check, Menu, LogOut, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/app/providers/ThemeProvider'
import { ThemeMode } from '@/shared/types'
import { useAuth } from '@/app/providers/AuthProvider'
import AvatarDisplay from '@/shared/components/AvatarDisplay'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Jasny', icon: <Sun size={14} /> },
  { value: 'dark', label: 'Ciemny', icon: <Moon size={14} /> },
  { value: 'system', label: 'Systemowy', icon: <Monitor size={14} /> },
]

interface TopbarProps {
  onMobileMenuOpen?: () => void
}

export default function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { mode, setMode } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="flex items-center h-16 px-4 md:px-6 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 gap-2">
      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 -ml-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={onMobileMenuOpen}
        aria-label="Otwórz menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile logo */}
      <div className="md:hidden flex-1 flex items-center">
        <img src="/app/images/samfin_logo_small.png" alt="SamFin" className="h-7 w-auto object-contain" />
      </div>

      {/* Desktop spacer */}
      <div className="hidden md:flex flex-1" />

      {/* Notifications */}
      <button className="relative p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c9a96e] rounded-full" />
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          aria-label="Menu użytkownika"
        >
          <AvatarDisplay
            sprite={user?.avatarSprite}
            index={user?.avatarIndex}
            displayName={user?.displayName}
            size={36}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <AvatarDisplay
                sprite={user?.avatarSprite}
                index={user?.avatarIndex}
                displayName={user?.displayName}
                size={32}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.displayName ?? '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}
                </p>
              </div>
            </div>

            {/* Theme */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1">
                Motyw
              </p>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setMode(opt.value); setMenuOpen(false) }}
                  className="flex items-center w-full gap-2.5 px-2 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-gray-400 dark:text-gray-500">{opt.icon}</span>
                  <span className="flex-1 text-left">{opt.label}</span>
                  {mode === opt.value && <Check size={13} className="text-[#c9a96e]" />}
                </button>
              ))}
            </div>

            {/* Profile */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/moje-konto')
                }}
                className="flex items-center w-full gap-2.5 px-2 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <UserCircle size={14} />
                <span>Moje konto</span>
              </button>
            </div>

            {/* Logout */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex items-center w-full gap-2.5 px-2 py-1.5 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <LogOut size={14} />
                <span>Wyloguj</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
