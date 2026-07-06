import { Outlet, useMatch } from 'react-router-dom'
import PageHeader from '@/layout/PageHeader'

export default function ReportsLayout() {
  const isSettlementReport = useMatch({ path: '/raporty/settlements', end: false })

  return (
    <div className={isSettlementReport ? 'p-4 md:p-6' : 'p-4 md:p-6 max-w-screen-xl'}>
      <PageHeader
        title="Raporty"
        subtitle="Analizy i zestawienia finansowe"
      />
      <Outlet />
    </div>
  )
}
