import { useEffect, useState } from 'react'

export type TransactionFilterSidebarTab = 'filters' | 'saved'

interface TransactionFilterSidebarTabsProps {
  active: TransactionFilterSidebarTab
  onChange: (tab: TransactionFilterSidebarTab) => void
}

function tabClass(isActive: boolean): string {
  return [
    'flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
    isActive
      ? 'border-[#c9a96e] text-[#c9a96e]'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
  ].join(' ')
}

export function useTransactionFilterSidebarTab(
  panelOpen: boolean,
): [TransactionFilterSidebarTab, (tab: TransactionFilterSidebarTab) => void] {
  const [activeTab, setActiveTab] = useState<TransactionFilterSidebarTab>('filters')

  useEffect(() => {
    if (!panelOpen) setActiveTab('filters')
  }, [panelOpen])

  return [activeTab, setActiveTab]
}

export default function TransactionFilterSidebarTabs({
  active,
  onChange,
}: TransactionFilterSidebarTabsProps) {
  return (
    <div
      className="shrink-0 flex gap-1 px-5 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label="Sekcje filtrów"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'filters'}
        className={tabClass(active === 'filters')}
        onClick={() => onChange('filters')}
      >
        Filtry
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'saved'}
        className={tabClass(active === 'saved')}
        onClick={() => onChange('saved')}
      >
        Zapisane filtry
      </button>
    </div>
  )
}
