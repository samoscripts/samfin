import { Outlet } from 'react-router-dom'
import PageHeader from '@/layout/PageHeader'

export default function ConfigurationLayout() {
  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <PageHeader
        title="Konfiguracja"
        subtitle="Słowniki i ustawienia domeny Dom"
      />
      <Outlet />
    </div>
  )
}
