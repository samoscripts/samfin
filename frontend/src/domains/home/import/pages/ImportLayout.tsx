import { NavLink, Outlet } from 'react-router-dom'
import { History, Plus } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'

const TABS = [
  { to: 'nowy',     label: 'Nowy import', icon: <Plus    size={14} /> },
  { to: 'historia', label: 'Historia',    icon: <History size={14} /> },
]

export default function ImportLayout() {
  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <PageHeader
        title="Import CSV"
        subtitle="Importowanie historii transakcji z banku"
      />

      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[#c9a96e] text-[#c9a96e]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300',
              ].join(' ')
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
