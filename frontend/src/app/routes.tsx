import { Routes, Route } from 'react-router-dom'
import Layout from '@/layout/Layout'
import Dashboard from '@/domains/home/dashboard/pages/Dashboard'
import Operacje from '@/domains/home/transactions/pages/Operacje'
import ComingSoon from '@/shared/components/ComingSoon'
import Settings from '@/domains/settings/pages/Settings'
import MyAccount from '@/domains/settings/pages/MyAccount'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="operacje" element={<Operacje />} />
        <Route path="import" element={<ComingSoon title="Import" subtitle="Import wyciągów bankowych" />} />
        <Route path="raporty" element={<ComingSoon title="Raporty" subtitle="Analizy i zestawienia finansowe" />} />
        <Route path="moje-konto" element={<MyAccount />} />
        <Route path="ustawienia" element={<Settings />} />
      </Route>
    </Routes>
  )
}
