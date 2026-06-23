import { Outlet } from 'react-router-dom'
import PageHeader from '@/layout/PageHeader'

export default function ReportsLayout() {
  return (
    <div className="p-4 md:p-6 max-w-screen-xl">
      <PageHeader
        title="Raporty"
        subtitle="Analizy i zestawienia finansowe"
      />
      <Outlet />
    </div>
  )
}
