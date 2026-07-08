import { useEffect, useState } from 'react'

export type ReportSidebarTab = 'params' | 'saved' | 'config'

interface ReportSidebarTabsProps {
  active: ReportSidebarTab
  onChange: (tab: ReportSidebarTab) => void
}

function tabClass(isActive: boolean): string {
  return [
    'flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
    isActive
      ? 'border-[#c9a96e] text-[#c9a96e]'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
  ].join(' ')
}

export function useReportSidebarTab(sidebarOpen: boolean): [ReportSidebarTab, (tab: ReportSidebarTab) => void] {
  const [activeTab, setActiveTab] = useState<ReportSidebarTab>('params')

  useEffect(() => {
    if (!sidebarOpen) setActiveTab('params')
  }, [sidebarOpen])

  return [activeTab, setActiveTab]
}

export default function ReportSidebarTabs({
  active,
  onChange,
}: Omit<ReportSidebarTabsProps, 'sidebarOpen'>) {
  return (
    <div
      className="shrink-0 flex gap-1 px-5 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label="Sekcje panelu"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'params'}
        className={tabClass(active === 'params')}
        onClick={() => onChange('params')}
      >
        Parametry raportu
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'saved'}
        className={tabClass(active === 'saved')}
        onClick={() => onChange('saved')}
      >
        Zapisane raporty
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'config'}
        className={tabClass(active === 'config')}
        onClick={() => onChange('config')}
      >
        Konfiguracja
      </button>
    </div>
  )
}
