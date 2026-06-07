import { useState } from 'react'
import { Construction, Users, ChevronRight } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import UsersPage from '../users/pages/Users'

type Tab = 'uzytkownicy' | 'system'

const TAB_LABELS: Record<Tab, string> = {
  uzytkownicy: 'Użytkownicy',
  system: 'System',
}

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [activeTab, setActiveTab] = useState<Tab>(isAdmin ? 'uzytkownicy' : 'system')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'uzytkownicy', label: 'Użytkownicy', icon: <Users size={15} />, adminOnly: true },
    { id: 'system', label: 'System', icon: <Construction size={15} /> },
  ]

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <div className="mb-6">
        <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Ustawienia</span>
          <ChevronRight size={12} />
          <span>{TAB_LABELS[activeTab]}</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Ustawienia</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Konfiguracja aplikacji SamFin</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-[#c9a96e] text-[#1c4230] dark:text-[#c9a96e]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'uzytkownicy' && isAdmin && <UsersPage />}

      {activeTab === 'system' && (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <Construction size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">W przygotowaniu</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Ta sekcja zostanie uruchomiona wkrótce</p>
        </div>
      )}
    </div>
  )
}
