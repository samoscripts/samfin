import { Construction } from 'lucide-react'
import PageHeader from '@/layout/PageHeader'

interface Props {
  title: string
  subtitle?: string
}

export default function ComingSoon({ title, subtitle }: Props) {
  return (
    <div className="p-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <Construction size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Moduł w przygotowaniu</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Ta sekcja zostanie uruchomiona wkrótce</p>
      </div>
    </div>
  )
}
