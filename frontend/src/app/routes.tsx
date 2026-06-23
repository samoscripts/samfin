import { Navigate, Routes, Route } from 'react-router-dom'
import Layout       from '@/layout/Layout'
import Dashboard    from '@/domains/home/dashboard/pages/Dashboard'
import Transactions from '@/domains/home/transactions/pages/Transactions'
import TransactionEditRedirect from '@/domains/home/transactions/pages/TransactionEditRedirect'
import TransactionNewRedirect from '@/domains/home/transactions/pages/TransactionNewRedirect'
import ReportsLayout from '@/domains/home/reports/pages/ReportsLayout'
import MonthlyReport from '@/domains/home/reports/default/pages/MonthlyReport'
import CommonAccountSettlementLayout from '@/domains/home/reports/common-account/pages/CommonAccountSettlementLayout'
import CommonAccountSettlementReport from '@/domains/home/reports/common-account/pages/CommonAccountSettlementReport'
import CommonAccountSettlementSettings from '@/domains/home/reports/common-account/pages/CommonAccountSettlementSettings'
import Settings     from '@/domains/settings/pages/Settings'
import UsersPage    from '@/domains/settings/users/pages/Users'
import SystemSettings from '@/domains/settings/system/pages/SystemSettings'
import MyAccount    from '@/domains/settings/pages/MyAccount'
import Configuration from '@/domains/home/configuration/pages/Configuration'
import Parties      from '@/domains/home/configuration/parties/pages/Parties'
import Wallets      from '@/domains/home/configuration/wallets/pages/Wallets'
import Concerns     from '@/domains/home/configuration/concerns/pages/Concerns'
import Categories   from '@/domains/home/configuration/categories/pages/Categories'
import { CategoriesCreateRedirect, CategoriesEditRedirect } from '@/domains/home/configuration/categories/pages/CategoriesLegacyRedirect'
import ClassificationRules from '@/domains/home/configuration/classification-rules/pages/ClassificationRules'
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
        <Route path="transactions/new" element={<TransactionNewRedirect />} />
        <Route path="transactions/:transactionId/edit" element={<TransactionEditRedirect />} />

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

        <Route path="raporty" element={<ReportsLayout />}>
          <Route index element={<Navigate to="default/monthly" replace />} />
          <Route path="default/monthly" element={<MonthlyReport />} />
          <Route path="common-account" element={<CommonAccountSettlementLayout />}>
            <Route index element={<CommonAccountSettlementReport />} />
            <Route path="settings" element={<CommonAccountSettlementSettings />} />
          </Route>
          {/* legacy redirects */}
          <Route path="miesieczny" element={<Navigate to="/raporty/default/monthly" replace />} />
          <Route path="domyslne/miesieczny" element={<Navigate to="/raporty/default/monthly" replace />} />
          <Route path="konto-wspolne" element={<Navigate to="/raporty/common-account" replace />} />
          <Route path="konto-wspolne/konfiguracja" element={<Navigate to="/raporty/common-account/settings" replace />} />
        </Route>

        <Route path="konfiguracja" element={<Configuration />}>
          <Route index element={<Navigate to="podmioty" replace />} />
          <Route path="podmioty">
            <Route index element={<Parties />} />
            <Route path="nowy" element={<Parties />} />
            <Route path=":entityId/edycja" element={<Parties />} />
          </Route>
          <Route path="portfele">
            <Route index element={<Wallets />} />
            <Route path="nowy" element={<Wallets />} />
            <Route path=":entityId/edycja" element={<Wallets />} />
          </Route>
          <Route path="dotyczy">
            <Route index element={<Concerns />} />
            <Route path="nowy" element={<Concerns />} />
            <Route path=":entityId/edycja" element={<Concerns />} />
          </Route>
          <Route path="kategorie">
            <Route index element={<Categories />} />
            <Route path="nowy" element={<CategoriesCreateRedirect />} />
            <Route path=":entityId/edycja" element={<CategoriesEditRedirect />} />
          </Route>
          <Route path="reguly">
            <Route index element={<ClassificationRules />} />
            <Route path="nowy" element={<ClassificationRules />} />
            <Route path=":entityId/edycja" element={<ClassificationRules />} />
          </Route>
        </Route>

        <Route path="moje-konto" element={<MyAccount />} />
        <Route path="ustawienia" element={<Settings />}>
          <Route index element={<Navigate to="uzytkownicy" replace />} />
          <Route path="uzytkownicy">
            <Route index element={<UsersPage />} />
            <Route path="nowy" element={<UsersPage />} />
            <Route path=":entityId/edycja" element={<UsersPage />} />
          </Route>
          <Route path="system" element={<SystemSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}
