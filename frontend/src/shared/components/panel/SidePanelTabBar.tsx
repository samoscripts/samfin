import type { ReactNode } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export interface SidePanelTab {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface SidePanelTabBarProps {
  tabs: SidePanelTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onClose: () => void
  expanded?: boolean
  onToggleExpand?: () => void
  showExpand?: boolean
}

function tabClass(isActive: boolean, disabled?: boolean): string {
  return [
    'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px',
    isActive
      ? 'border-[#c9a96e] text-[#c9a96e]'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
    disabled ? 'opacity-40 cursor-not-allowed' : '',
  ].join(' ')
}

export default function SidePanelTabBar({
  tabs,
  activeTab,
  onTabChange,
  onClose,
  expanded = false,
  onToggleExpand,
  showExpand = true,
}: SidePanelTabBarProps) {
  const isMobile = useIsMobile()

  return (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          className={tabClass(activeTab === tab.id, tab.disabled)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}

      {!isMobile && showExpand && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="ml-auto p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
          title={expanded ? 'Zwiń panel' : 'Rozszerz panel'}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className={[
          'p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors',
          isMobile && (!showExpand || !onToggleExpand) ? 'ml-auto mr-3' : 'mr-3',
        ].join(' ')}
        aria-label="Zamknij panel"
      >
        <X size={14} />
      </button>
    </div>
  )
}
