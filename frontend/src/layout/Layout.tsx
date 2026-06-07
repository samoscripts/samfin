import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { RightPanelContext } from './RightPanelContext'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null)

  const handleToggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), [])
  const handleMobileOpen = useCallback(() => setMobileSidebarOpen(true), [])
  const handleMobileClose = useCallback(() => setMobileSidebarOpen(false), [])

  return (
    <RightPanelContext.Provider value={portalRoot}>
      <div className="min-h-screen md:flex md:h-screen md:min-h-0 md:overflow-hidden bg-gray-50 dark:bg-gray-950">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />

        <div className="flex flex-col min-h-screen md:min-h-0 md:flex-1 min-w-0 md:overflow-hidden">
          <Topbar onMobileMenuOpen={handleMobileOpen} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        <div ref={setPortalRoot} className="shrink-0" />
      </div>
    </RightPanelContext.Provider>
  )
}
