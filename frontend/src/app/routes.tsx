import { Navigate, Routes, Route } from 'react-router-dom'
import Layout       from '@/layout/Layout'
import Dashboard    from '@/domains/home/dashboard/pages/Dashboard'
import Transactions from '@/domains/home/transactions/pages/Transactions'
import ComingSoon   from '@/shared/components/ComingSoon'
import Settings     from '@/domains/settings/pages/Settings'
import UsersPage    from '@/domains/settings/users/pages/Users'
import SystemSettings from '@/domains/settings/system/pages/SystemSettings'
import MyAccount    from '@/domains/settings/pages/MyAccount'
import Configuration from '@/domains/home/configuration/pages/Configuration'
import Parties      from '@/domains/home/configuration/parties/pages/Parties'
import Wallets      from '@/domains/home/configuration/wallets/pages/Wallets'
import Concerns     from '@/domains/home/configuration/concerns/pages/Concerns'
import Categories   from '@/domains/home/configuration/categories/pages/Categories'
import ImportLayout    from '@/domains/home/import/pages/ImportLayout'
import ImportNowy      from '@/domains/home/import/pages/ImportNowy'
import ImportHistoria  from '@/domains/home/import/pages/ImportHistoria'
import ImportSzczegoly from '@/domains/home/import/pages/ImportSzczegoly'
import ImportBledy     from '@/domains/home/import/pages/ImportBledy'
import ImportWiersze   from '@/domains/home/import/pages/ImportWiersze'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />

        {/* Import CSV — url-based tab navigation */}
        <Route path="import" element={<ImportLayout />}>
          <Route index element={<Navigate to="nowy" replace />} />
          <Route path="nowy" element={<ImportNowy />} />
          <Route path="historia" element={<ImportHistoria />} />
          <Route path="historia/:id" element={<ImportSzczegoly />}>
            <Route index element={<Navigate to="bledy" replace />} />
            <Route path="bledy"   element={<ImportBledy />} />
            <Route path="wiersze" element={<ImportWiersze />} />
          </Route>
        </Route>

        <Route path="raporty" element={<ComingSoon title="Raporty" subtitle="Analizy i zestawienia finansowe" />} />

        <Route path="konfiguracja" element={<Configuration />}>
          <Route index element={<Navigate to="podmioty" replace />} />
          <Route path="podmioty"  element={<Parties />} />
          <Route path="portfele"  element={<Wallets />} />
          <Route path="dotyczy"   element={<Concerns />} />
          <Route path="kategorie" element={<Categories />} />
        </Route>

        <Route path="moje-konto" element={<MyAccount />} />
        <Route path="ustawienia" element={<Settings />}>
          <Route index element={<Navigate to="uzytkownicy" replace />} />
          <Route path="uzytkownicy" element={<UsersPage />} />
          <Route path="system" element={<SystemSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}
