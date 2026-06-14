import { Construction, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

const TABS = [
  { to: 'uzytkownicy', label: 'Użytkownicy', icon: <Users size={15} />, adminOnly: true },
  { to: 'system', label: 'System', icon: <Construction size={15} />, adminOnly: true },
]

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Ustawienia</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Konfiguracja aplikacji SamFin</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-1 -mb-px" aria-label="Zakładki ustawień">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#c9a96e] text-[#1c4230] dark:text-[#c9a96e]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                ].join(' ')
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
