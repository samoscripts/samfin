import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

interface NavChild {
  to: string
  label: string
  end?: boolean
  isActive?: (pathname: string) => boolean
}

interface NavSection {
  label?: string
  items: NavChild[]
}

export interface NavGroupConfig {
  id: string
  label: string
  icon: React.ReactNode
  basePath: string
  defaultTo: string
  sections: NavSection[]
}

interface SidebarNavGroupProps {
  group: NavGroupConfig
  collapsed: boolean
  isMobile?: boolean
  onMobileClose?: () => void
  linkCls: (isActive: boolean) => string
  childLinkCls: (isActive: boolean) => string
}

export default function SidebarNavGroup({
  group,
  collapsed,
  isMobile = false,
  onMobileClose,
  linkCls,
  childLinkCls,
}: SidebarNavGroupProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const groupActive = location.pathname.startsWith(group.basePath)
  const [open, setOpen] = useState(groupActive)

  useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive])

  return (
    <div>
      <button
        type="button"
        title={collapsed ? group.label : undefined}
        onClick={() => {
          if (collapsed) {
            navigate(group.defaultTo)
            if (isMobile) onMobileClose?.()
            return
          }
          setOpen((v) => !v)
        }}
        className={[linkCls(groupActive), 'w-full', collapsed ? '' : 'justify-between'].join(' ')}
        aria-expanded={open}
      >
        <span className={['shrink-0 flex items-center', collapsed ? '' : 'gap-3'].join(' ')}>
          <span className={groupActive ? 'text-[#c9a96e]' : 'text-white/50'}>{group.icon}</span>
          {!collapsed && <span className="truncate">{group.label}</span>}
        </span>
        {!collapsed && (
          <ChevronDown
            size={14}
            className={[
              'shrink-0 text-white/40 transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            ].join(' ')}
          />
        )}
      </button>

      {open && !collapsed && (
        <div className="mt-0.5 space-y-1">
          {group.sections.map((section, sIdx) => (
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
                    className={({ isActive }) =>
                      childLinkCls(child.isActive ? child.isActive(location.pathname) : isActive)
                    }
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
  )
}
