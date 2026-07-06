import { Outlet, useMatch } from 'react-router-dom'
import PageHeader from '@/layout/PageHeader'

export default function ReportsLayout() {
  const isSettlements = useMatch({ path: '/raporty/settlements', end: false })
  const isBreakdown = useMatch({ path: '/raporty/breakdown', end: false })
  const isTrend = useMatch({ path: '/raporty/trend', end: false })
  const isAnalytics = useMatch({ path: '/raporty/analytics', end: false })
  const isFullWidth = Boolean(isSettlements || isBreakdown || isTrend || isAnalytics)

  return (
    <div className={isFullWidth ? 'p-4 md:p-6' : 'p-4 md:p-6 max-w-screen-xl'}>
      <PageHeader
        title="Raporty"
        subtitle="Analizy i zestawienia finansowe"
      />
      <Outlet />
    </div>
  )
}
