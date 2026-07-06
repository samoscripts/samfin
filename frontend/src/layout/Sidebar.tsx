import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  BarChart2,
  Settings,
  SlidersHorizontal,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useAppInfo } from '@/shared/hooks/useAppInfo'
import AvatarDisplay from '@/shared/components/AvatarDisplay'
import { getSidebarShellClass } from '@/shared/utils/environmentDisplay'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

interface NavChild {
  to: string
  label: string
  end?: boolean
}

interface NavSection {
  label?: string
  items: NavChild[]
}

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  basePath: string
  defaultTo: string
  sections: NavSection[]
}

const REPORTS_NAV: NavGroup = {
  id: 'reports',
  label: 'Raporty',
  icon: <BarChart2 size={18} />,
  basePath: '/raporty',
  defaultTo: '/raporty/analytics',
  sections: [
    {
      items: [
        { to: '/raporty/analytics', label: 'Analizy', end: true },
        { to: '/raporty/breakdown', label: 'Rozbicie' },
        { to: '/raporty/trend', label: 'Trend' },
        { to: '/raporty/settlements', label: 'Rozliczenia' },
      ],
    },
  ],
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/transactions', label: 'Transactions', icon: <ArrowLeftRight size={18} /> },
  { to: '/import', label: 'Import', icon: <Upload size={18} /> },
]

const NAV_AFTER: NavItem[] = [
  { to: '/o-aplikacji', label: 'O aplikacji', icon: <BookOpen size={18} /> },
  { to: '/konfiguracja', label: 'Konfiguracja', icon: <SlidersHorizontal size={18} /> },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarNav({
  collapsed,
  onToggle,
  onMobileClose,
  isMobile = false,
}: {
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
  isMobile?: boolean
}) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navCollapsed = isMobile ? false : collapsed
  const isAdmin = user?.role === 'ADMIN'

  const reportsActive = location.pathname.startsWith(REPORTS_NAV.basePath)
  const [reportsOpen, setReportsOpen] = useState(reportsActive)

  useEffect(() => {
    if (reportsActive) setReportsOpen(true)
  }, [reportsActive])

  const linkCls = (isActive: boolean) =>
    [
      'flex items-center rounded-md text-sm font-medium transition-colors',
      navCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      isActive
        ? 'text-[#c9a96e] bg-white/10'
        : 'text-white/60 hover:text-white/90 hover:bg-white/8',
    ].join(' ')

  const childLinkCls = (isActive: boolean) =>
    [
      'flex items-center rounded-md text-sm transition-colors py-2 pr-3',
      navCollapsed ? 'justify-center px-0' : 'pl-9',
      isActive
        ? 'text-[#c9a96e] font-medium'
        : 'text-white/50 hover:text-white/80 hover:bg-white/5',
    ].join(' ')

  return (
    <>
      <div
        className={[
          'flex items-center h-16 shrink-0 border-b border-white/10 relative overflow-hidden',
          navCollapsed ? 'justify-center px-0' : 'justify-start pl-3 pr-4',
        ].join(' ')}
      >
        {navCollapsed ? (
          <img src="/app/images/samfin_logo_ico.png" alt="SamFin" className="relative h-9 w-9 object-contain" />
        ) : (
          <img src="/app/images/samfin_logo_small.png" alt="SamFin" className="relative h-11 w-auto object-contain" />
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Zamknij menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={navCollapsed ? item.label : undefined}
            onClick={isMobile ? onMobileClose : undefined}
            className={({ isActive }) => linkCls(isActive)}
          >
            {({ isActive }) => (
              <>
                <span className={['shrink-0', isActive ? 'text-[#c9a96e]' : 'text-white/50'].join(' ')}>
                  {item.icon}
                </span>
                {!navCollapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Reports — expandable group */}
        <div>
          <button
            type="button"
            title={navCollapsed ? REPORTS_NAV.label : undefined}
            onClick={() => {
              if (navCollapsed) {
                navigate(REPORTS_NAV.defaultTo)
                if (isMobile) onMobileClose?.()
                return
              }
              setReportsOpen((v) => !v)
            }}
            className={[
              linkCls(reportsActive),
              'w-full',
              navCollapsed ? '' : 'justify-between',
            ].join(' ')}
            aria-expanded={reportsOpen}
          >
            <span className={['shrink-0 flex items-center', navCollapsed ? '' : 'gap-3'].join(' ')}>
              <span className={reportsActive ? 'text-[#c9a96e]' : 'text-white/50'}>
                {REPORTS_NAV.icon}
              </span>
              {!navCollapsed && <span className="truncate">{REPORTS_NAV.label}</span>}
            </span>
            {!navCollapsed && (
              <ChevronDown
                size={14}
                className={[
                  'shrink-0 text-white/40 transition-transform',
                  reportsOpen ? 'rotate-0' : '-rotate-90',
                ].join(' ')}
              />
            )}
          </button>

          {reportsOpen && !navCollapsed && (
            <div className="mt-0.5 space-y-1">
              {REPORTS_NAV.sections.map((section, sIdx) => (
                <div key={sIdx}>
                  {section.label && (
                    <p className="pl-9 pt-1 text-[10px] uppercase tracking-wide text-white/30 font-medium">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.end}
                        onClick={isMobile ? onMobileClose : undefined}
                        className={({ isActive }) => childLinkCls(isActive)}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {NAV_AFTER.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={navCollapsed ? item.label : undefined}
            onClick={isMobile ? onMobileClose : undefined}
            className={({ isActive }) => linkCls(isActive)}
          >
            {({ isActive }) => (
              <>
                <span className={['shrink-0', isActive ? 'text-[#c9a96e]' : 'text-white/50'].join(' ')}>
                  {item.icon}
                </span>
                {!navCollapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
        {isAdmin && (
          <NavLink
            to="/ustawienia"
            title={navCollapsed ? 'Ustawienia' : undefined}
            onClick={isMobile ? onMobileClose : undefined}
            className={({ isActive }) => linkCls(isActive)}
          >
            {({ isActive }) => (
              <>
                <span className={['shrink-0', isActive ? 'text-[#c9a96e]' : 'text-white/50'].join(' ')}>
                  <Settings size={18} />
                </span>
                {!navCollapsed && <span className="truncate">Ustawienia</span>}
              </>
            )}
          </NavLink>
        )}

        {user && !navCollapsed && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2.5 px-3 py-2">
            <AvatarDisplay
              sprite={user.avatarSprite}
              index={user.avatarIndex}
              displayName={user.displayName}
              size={28}
            />
            <span className="flex-1 text-xs font-medium text-white/70 truncate">
              {user.displayName}
            </span>
            <button
              onClick={() => logout()}
              title="Wyloguj"
              className="shrink-0 p-1 rounded text-white/40 hover:text-white/70 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {!isMobile && (
          <button
            onClick={onToggle}
            title={navCollapsed ? 'Rozwiń menu' : 'Zwiń menu'}
            className={[
              'flex items-center w-full rounded-md text-sm transition-colors text-white/40 hover:text-white/70 hover:bg-white/8',
              navCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
            ].join(' ')}
          >
            <span className="shrink-0">
              {navCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </span>
            {!navCollapsed && <span className="truncate text-xs">Zwiń</span>}
          </button>
        )}
      </div>
    </>
  )
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const info = useAppInfo()
  const shellBg = getSidebarShellClass(info?.environment)

  return (
    <>
      <aside
        className={[
          'hidden md:flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden',
          shellBg,
          collapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        <SidebarNav collapsed={collapsed} onToggle={onToggle} />
      </aside>

      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col overflow-hidden ${shellBg}`}>
            <SidebarNav
              collapsed={false}
              onToggle={onToggle}
              onMobileClose={onMobileClose}
              isMobile
            />
          </aside>
        </>
      )}
    </>
  )
}
