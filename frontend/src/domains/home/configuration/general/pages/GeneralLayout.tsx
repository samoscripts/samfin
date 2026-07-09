import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: 'podmioty',  label: 'Podmioty'  },
  { to: 'portfele',  label: 'Portfele'  },
  { to: 'dotyczy',   label: 'Dotyczy'   },
  { to: 'kategorie', label: 'Kategorie' },
]

export default function GeneralLayout() {
  return (
    <>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Zakładki konfiguracji ogólnej">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#c9a96e] text-[#c9a96e]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                ].join(' ')
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </>
  )
}
