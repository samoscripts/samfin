import { NavLink, Outlet } from 'react-router-dom'

const REPORT_TABS = [
  { to: '.', label: 'Podsumowanie', end: true },
  { to: 'rotacyjne', label: 'Wpłaty rotacyjne', end: true },
  { to: 'portfele', label: 'Portfele', end: true },
  { to: 'wklady-wlasne', label: 'Wkłady własne', end: true },
  { to: 'pozostale', label: 'Pozostałe', end: true },
]

const tabCls = ({ isActive }: { isActive: boolean }) =>
  [
    'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
    isActive
      ? 'border-[#c9a96e] text-[#c9a96e]'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
  ].join(' ')

export default function SettlementLayout() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav
          className="-mb-px flex items-center gap-0"
          aria-label="Zakładki rozliczeń"
        >
          <div className="flex gap-0 overflow-x-auto min-w-0">
            {REPORT_TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabCls}>
                {tab.label}
              </NavLink>
            ))}
          </div>
          <NavLink
            to="settings"
            end
            className={({ isActive }) => [tabCls({ isActive }), 'ml-auto shrink-0'].join(' ')}
          >
            Konfiguracja
          </NavLink>
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
